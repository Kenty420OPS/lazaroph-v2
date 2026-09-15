import { NextResponse } from "next/server";
import { adminDb, adminAuth, adminStorage } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";

// POST /api/admin/products - Add a new product (Admin authorized only)
export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let name = "";
    let brand = "";
    let category = "Sneakers";
    let price = 0;
    let stock = 10;
    let description = "";
    let imageUrl = "";
    let imageFile: File | null = null;
    let simulateUploadFailure = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = (formData.get("name") as string) || "";
      brand = (formData.get("brand") as string) || "";
      category = (formData.get("category") as string) || "Sneakers";
      price = parseFloat((formData.get("price") as string) || "0");
      stock = parseInt((formData.get("stock") as string) || "10", 10);
      description = (formData.get("description") as string) || "";
      imageUrl = (formData.get("imageUrl") as string) || "";
      simulateUploadFailure = formData.get("simulateUploadFailure") === "true";

      const fileEntry = formData.get("image");
      if (fileEntry && typeof fileEntry === "object" && "arrayBuffer" in fileEntry && (fileEntry as File).size > 0) {
        imageFile = fileEntry as File;
      }
    } else {
      const body = await request.json();
      name = body.name || "";
      brand = body.brand || "";
      category = body.category || "Sneakers";
      price = Number(body.price) || 0;
      stock = Number(body.stock) || 10;
      description = body.description || "";
      imageUrl = body.imageUrl || "";
      simulateUploadFailure = Boolean(body.simulateUploadFailure);
    }

    if (!name.trim()) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
    }

    let finalImageUrl = imageUrl;

    if (simulateUploadFailure) {
      console.error("[Admin Products API] Simulated image upload failure requested.");
      return NextResponse.json(
        {
          success: false,
          error: "Image upload failed (Simulated Upload Failure). Product was NOT saved to Firestore.",
        },
        { status: 500 }
      );
    }

    if (imageFile) {
      try {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const safeFileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        
        const bucket = adminStorage.bucket();
        console.log('[Upload] Using Bucket:', bucket.name);
        
        const file = bucket.file(`products/${safeFileName}`);
        
        await file.save(buffer, {
          metadata: { contentType: imageFile.type || "image/jpeg" },
        });
        
        // Use standard Firebase Storage public URL format instead of makePublic()
        finalImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`products/${safeFileName}`)}?alt=media`;
      } catch (uploadError: any) {
        console.error("Storage upload failed in POST /api/admin/products:", uploadError);
        return NextResponse.json(
          {
            success: false,
            error: `Image upload failed: ${uploadError.message || "Storage error"}. Product was NOT saved to Firestore.`,
          },
          { status: 500 }
        );
      }
    }

    // Step 2: Save product to Firestore using Admin SDK to bypass security rules
    const productPayload = {
      name: name.trim(),
      title: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      price: Number(price),
      stock: Number(stock),
      description: description.trim(),
      imageUrl: finalImageUrl,
      mainImageUrl: finalImageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("products").add(productPayload);

    return NextResponse.json({
      success: true,
      message: "Product created successfully",
      product: {
        id: docRef.id,
        ...productPayload,
      },
    });
  } catch (globalError: any) {
    console.error("POST /api/admin/products global error:", globalError);
    return NextResponse.json(
      { success: false, error: globalError.message || "Failed to create product" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products - Edit product (Admin authorized only)
export async function PUT(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let id = "";
    let name = "";
    let brand = "";
    let category = "Sneakers";
    let price = 0;
    let stock = 10;
    let description = "";
    let imageUrl = "";
    let imageFile: File | null = null;
    let simulateUploadFailure = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      id = (formData.get("id") as string) || "";
      name = (formData.get("name") as string) || "";
      brand = (formData.get("brand") as string) || "";
      category = (formData.get("category") as string) || "Sneakers";
      price = parseFloat((formData.get("price") as string) || "0");
      stock = parseInt((formData.get("stock") as string) || "10", 10);
      description = (formData.get("description") as string) || "";
      imageUrl = (formData.get("imageUrl") as string) || "";
      simulateUploadFailure = formData.get("simulateUploadFailure") === "true";

      const fileEntry = formData.get("image");
      if (fileEntry && typeof fileEntry === "object" && "arrayBuffer" in fileEntry && (fileEntry as File).size > 0) {
        imageFile = fileEntry as File;
      }
    } else {
      const body = await request.json();
      id = body.id || "";
      name = body.name || "";
      brand = body.brand || "";
      category = body.category || "Sneakers";
      price = Number(body.price) || 0;
      stock = Number(body.stock) || 10;
      description = body.description || "";
      imageUrl = body.imageUrl || "";
      simulateUploadFailure = Boolean(body.simulateUploadFailure);
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required for editing" },
        { status: 400 }
      );
    }

    if (simulateUploadFailure) {
      return NextResponse.json(
        {
          success: false,
          error: "Image upload failed (Simulated Upload Failure). Product update aborted.",
        },
        { status: 500 }
      );
    }

    let finalImageUrl = imageUrl;
    if (imageFile) {
      try {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const safeFileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        
        const bucket = adminStorage.bucket();
        const file = bucket.file(`products/${safeFileName}`);
        
        await file.save(buffer, {
          metadata: { contentType: imageFile.type || "image/jpeg" },
        });
        
        finalImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`products/${safeFileName}`)}?alt=media`;
      } catch (uploadError: any) {
        return NextResponse.json(
          {
            success: false,
            error: `Image upload failed: ${uploadError.message}. Product update aborted.`,
          },
          { status: 500 }
        );
      }
    }

    const updatePayload: any = {
      name: name.trim(),
      title: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      price: Number(price),
      stock: Number(stock),
      description: description.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (finalImageUrl) {
      updatePayload.imageUrl = finalImageUrl;
      updatePayload.mainImageUrl = finalImageUrl;
    }

    // Use Admin SDK to update bypassing rules
    await adminDb.collection("products").doc(id).update(updatePayload);

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      product: { id, ...updatePayload },
    });
  } catch (globalError: any) {
    console.error("PUT /api/admin/products global error:", globalError);
    return NextResponse.json(
      { success: false, error: globalError.message || "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products - Delete product (Admin authorized only)
export async function DELETE(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required for deletion" },
        { status: 400 }
      );
    }

    // Use Admin SDK to delete bypassing rules
    await adminDb.collection("products").doc(id).delete();

    return NextResponse.json({
      success: true,
      message: `Product ${id} deleted successfully`,
    });
  } catch (globalError: any) {
    console.error("DELETE /api/admin/products global error:", globalError);
    return NextResponse.json(
      { success: false, error: globalError.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}
