import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { verifySuperadminRequest, isStaffRole } from "@/lib/admin-auth";

// GET /api/admin/admins — list all admin/superadmin accounts (superadmin only)
export async function GET(request: Request) {
  try {
    const auth = await verifySuperadminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const admins = await listAdminUsers();
    return NextResponse.json({ success: true, admins }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/admins error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list admin accounts" },
      { status: 500 }
    );
  }
}

// POST /api/admin/admins — create a new admin/superadmin account (superadmin only)
export async function POST(request: Request) {
  try {
    const auth = await verifySuperadminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, displayName, role, password } = body;

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 });
    }
    if (typeof displayName !== "string" || displayName.trim().length < 1 || displayName.length > 100) {
      return NextResponse.json({ success: false, error: "displayName must be 1-100 characters" }, { status: 400 });
    }
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ success: false, error: "role must be 'admin' or 'superadmin'" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return NextResponse.json({ success: false, error: "password must be 8-128 characters" }, { status: 400 });
    }

    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: displayName.trim(),
        emailVerified: false,
      });
    } catch (createError: any) {
      if (createError && createError.code === "auth/email-already-exists") {
        return NextResponse.json({ success: false, error: "Email already in use" }, { status: 409 });
      }
      console.error("POST /api/admin/admins createUser error:", createError);
      return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 });
    }

    try {
      await adminAuth.setCustomUserClaims(userRecord.uid, { role });
    } catch (claimsError: any) {
      console.error("POST /api/admin/admins setCustomUserClaims error:", claimsError);
      try {
        await adminAuth.deleteUser(userRecord.uid);
      } catch (rollbackError: any) {
        console.error("POST /api/admin/admins rollback deleteUser error:", rollbackError);
      }
      return NextResponse.json({ success: false, error: "Failed to assign role; user creation rolled back" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        admin: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role,
          disabled: userRecord.disabled,
          createdAt: userRecord.metadata.creationTime,
          lastSignInAt: userRecord.metadata.lastSignInTime || null,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/admins error:", error);
    return NextResponse.json({ success: false, error: "Failed to create admin" }, { status: 500 });
  }
}

// PATCH /api/admin/admins — change role and/or disable status (superadmin only)
export async function PATCH(request: Request) {
  try {
    const auth = await verifySuperadminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { uid, role, disabled } = body;

    if (typeof uid !== "string" || uid.length === 0) {
      return NextResponse.json({ success: false, error: "uid is required" }, { status: 400 });
    }
    if (role === undefined && disabled === undefined) {
      return NextResponse.json({ success: false, error: "At least one of 'role' or 'disabled' is required" }, { status: 400 });
    }
    if (role !== undefined && role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ success: false, error: "role must be 'admin' or 'superadmin'" }, { status: 400 });
    }
    if (disabled !== undefined && typeof disabled !== "boolean") {
      return NextResponse.json({ success: false, error: "disabled must be a boolean" }, { status: 400 });
    }

    // Self-modify guard
    if (uid === auth.uid) {
      return NextResponse.json(
        { success: false, error: "A superadmin cannot change their own role or disabled status" },
        { status: 400 }
      );
    }

    let target;
    try {
      target = await adminAuth.getUser(uid);
    } catch (getError: any) {
      if (getError && getError.code === "auth/user-not-found") {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }
      console.error("PATCH /api/admin/admins getUser error:", getError);
      return NextResponse.json({ success: false, error: "Failed to load target user" }, { status: 500 });
    }

    const targetRole = (target.customClaims as any)?.role;
    if (!isStaffRole(targetRole)) {
      return NextResponse.json({ success: false, error: "Target user is not an admin account" }, { status: 400 });
    }

    // Last active superadmin guard
    const demotingSuperadmin = targetRole === "superadmin" && role !== undefined && role !== "superadmin";
    const disablingSuperadmin = targetRole === "superadmin" && disabled === true;
    if ((demotingSuperadmin || disablingSuperadmin) && !target.disabled) {
      const admins = await listAdminUsers();
      const activeSuperadmins = admins.filter(
        (a) => a.role === "superadmin" && !a.disabled
      );
      if (activeSuperadmins.length <= 1 && activeSuperadmins[0]?.uid === uid) {
        return NextResponse.json(
          { success: false, error: "Cannot demote or disable the last active superadmin" },
          { status: 400 }
        );
      }
    }

    if (role !== undefined) {
      await adminAuth.setCustomUserClaims(uid, { role });
      await adminAuth.revokeRefreshTokens(uid);
    }

    if (disabled !== undefined) {
      await adminAuth.updateUser(uid, { disabled });
      if (disabled === true) {
        await adminAuth.revokeRefreshTokens(uid);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/admin/admins error:", error);
    return NextResponse.json({ success: false, error: "Failed to update admin" }, { status: 500 });
  }
}

async function listAdminUsers(): Promise<Array<{
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  role: string;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}>> {
  const result: Array<{
    uid: string;
    email: string | undefined;
    displayName: string | undefined;
    role: string;
    disabled: boolean;
    createdAt: string;
    lastSignInAt: string | null;
  }> = [];

  let pageToken: string | undefined = undefined;
  for (let page = 0; page < 10; page++) {
    const listResult = await adminAuth.listUsers(1000, pageToken);
    for (const user of listResult.users) {
      // Never include anonymous (guest) users
      if (user.providerData.length === 0) continue;
      const role = (user.customClaims as any)?.role;
      if (role !== "admin" && role !== "superadmin") continue;
      result.push({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role,
        disabled: user.disabled,
        createdAt: user.metadata.creationTime,
        lastSignInAt: user.metadata.lastSignInTime || null,
      });
    }
    if (!listResult.pageToken) break;
    pageToken = listResult.pageToken;
  }

  return result;
}
