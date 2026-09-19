"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, getDoc, writeBatch, increment } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync isOpen state to ref for listeners
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          if (tokenResult.claims.role === 'admin') {
            setIsAdmin(true);
            setSessionId(null);
            setMessages([]);
            setUnreadCount(0);
            setAuthReady(true);
            return;
          }
          setIsAdmin(false);
          setSessionId(user.uid);
          setErrorMsg("");
        } catch (e) {
          console.error(e);
        }
      } else {
        setIsAdmin(false);
        setSessionId(null);
        setMessages([]);
        setUnreadCount(0);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Lazily sign in when opened if not already authed
  useEffect(() => {
    if (isOpen && authReady && !auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous auth failed:", error);
        setErrorMsg("Failed to connect to chat.");
      });
    }
  }, [isOpen, authReady]);

  // Listen for messages
  useEffect(() => {
    if (!sessionId || isAdmin) return;

    const messagesRef = collection(db, "conversations", sessionId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [sessionId, isAdmin]);

  // Listen for unreadCustomer count (independent of isOpen state)
  useEffect(() => {
    if (!sessionId || isAdmin) return;
    const unsub = onSnapshot(doc(db, "conversations", sessionId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!isOpenRef.current) {
          setUnreadCount(data.unreadCustomer || 0);
        } else {
          setUnreadCount(0);
          if (data.unreadCustomer > 0) {
            // clear unreadCustomer atomically
            const batch = writeBatch(db);
            batch.update(doc(db, "conversations", sessionId), { unreadCustomer: 0 });
            batch.commit().catch(console.error);
          }
        }
      }
    });
    return () => unsub();
  }, [sessionId, isAdmin]); // No dependency on isOpen, uses isOpenRef


  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId) return;

    const text = newMessage.trim();
    setNewMessage(""); // Optimistic clear
    setErrorMsg("");

    try {
      const convRef = doc(db, "conversations", sessionId);
      const messagesRef = collection(db, "conversations", sessionId, "messages");
      
      const convSnap = await getDoc(convRef);
      const batch = writeBatch(db);
      
      if (!convSnap.exists()) {
        batch.set(convRef, {
          customerId: sessionId,
          customerName: "Guest",
          lastMessage: text,
          updatedAt: serverTimestamp(),
          unreadAdmin: 1,
          unreadCustomer: 0
        });
      } else {
        batch.update(convRef, {
          lastMessage: text,
          updatedAt: serverTimestamp(),
          unreadAdmin: increment(1)
        });
      }

      batch.set(doc(messagesRef), {
        senderId: sessionId,
        role: "customer",
        text,
        createdAt: serverTimestamp(),
        read: false
      });

      await batch.commit(); // Atomic Write Batch
    } catch (err) {
      console.error("Failed to send message:", err);
      setNewMessage(text); // restore input on failure
      setErrorMsg("Failed to send message.");
    }
  };

  if (isAdmin) return null; // Hide completely for admins (claims based)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-black border border-neutral-800 w-80 sm:w-96 h-[500px] max-h-[80vh] rounded-2xl shadow-2xl mb-4 flex flex-col overflow-hidden font-mono text-white">
          <div className="bg-neutral-900 border-b border-neutral-800 p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-sm">Lazaroph Support</h3>
              <p className="text-[10px] text-neutral-400">We typically reply in a few minutes.</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
            {messages.length === 0 ? (
              <div className="text-center text-neutral-500 text-xs mt-10">
                Send us a message and we'll get back to you!
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "customer" ? "justify-end" : "justify-start"}`}>
                  <div 
                    className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${msg.role === "customer" ? "bg-white text-black rounded-br-sm font-medium" : "bg-neutral-900 border border-neutral-800 text-white rounded-bl-sm"}`}
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-neutral-950 border-t border-neutral-800 flex flex-col gap-2">
            {errorMsg && <div className="text-red-500 text-[10px] px-1 font-bold">{errorMsg}</div>}
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type your message..." 
                className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors"
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim() || !sessionId}
                className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-opacity"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => {
            setIsOpen(true);
            if (unreadCount > 0 && sessionId) {
               // Optimistically clear when opened
               setUnreadCount(0);
               const batch = writeBatch(db);
               batch.update(doc(db, "conversations", sessionId), { unreadCustomer: 0 });
               batch.commit().catch(console.error);
            }
          }}
          className="w-14 h-14 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform relative border-2 border-black"
        >
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
              {unreadCount}
            </span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      )}
    </div>
  );
}
