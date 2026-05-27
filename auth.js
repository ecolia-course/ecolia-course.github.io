import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

export async function inscription(email, password) {
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "utilisateurs", userCred.user.uid), {
            email,
            stats: { totalChapitres: 0, tempsTotal: 0 },
            createdAt: new Date()
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function connexion(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deconnexion() {
    await signOut(auth);
}