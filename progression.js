import { db, auth } from "./firebase-init.js";
import { doc, setDoc, getDoc, updateDoc, increment, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Enregistrer qu'un utilisateur a consulté une page (cours)
export async function enregistrerConsultation(pageId) {
    const user = auth.currentUser;
    if (!user) return;
    
    const userRef = doc(db, "utilisateurs", user.uid);
    try {
        await setDoc(userRef, {
            dernieresPages: arrayUnion({
                pageId: pageId,
                timestamp: serverTimestamp(),
                date: new Date().toISOString().split('T')[0]
            })
        }, { merge: true });
    } catch (error) {
        console.error("Erreur enregistrerConsultation:", error);
    }
}

// Marquer un chapitre comme terminé
export async function marquerTermine(coursId, chapitreId) {
    const user = auth.currentUser;
    if (!user) return false;
    
    const userRef = doc(db, "utilisateurs", user.uid);
    try {
        await setDoc(userRef, {
            [`progression.${coursId}.termines`]: arrayUnion(chapitreId),
            [`progression.${coursId}.derniereActivite`]: serverTimestamp(),
            "stats.totalChapitres": increment(1),
            "stats.derniereMiseAJour": serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Erreur marquerTermine:", error);
        return false;
    }
}

// Récupérer la progression complète de l'utilisateur
export async function getProgression() {
    const user = auth.currentUser;
    if (!user) return null;
    
    const userRef = doc(db, "utilisateurs", user.uid);
    try {
        const snap = await getDoc(userRef);
        return snap.exists() ? snap.data() : {};
    } catch (error) {
        console.error("Erreur getProgression:", error);
        return {};
    }
}

// Stockage des timers pour le temps passé
let timers = {};

// Démarrer le chronomètre pour une page
export function startTimer(pageId) {
    timers[pageId] = Date.now();
}

// Arrêter le chronomètre et enregistrer le temps passé
export async function stopTimer(pageId) {
    if (!timers[pageId]) return;
    
    const duree = Math.round((Date.now() - timers[pageId]) / 1000);
    delete timers[pageId];
    
    const user = auth.currentUser;
    if (!user || duree < 2) return; // Ignorer les sessions trop courtes
    
    const userRef = doc(db, "utilisateurs", user.uid);
    try {
        await setDoc(userRef, {
            [`tempsParPage.${pageId}`]: increment(duree),
            "stats.tempsTotal": increment(duree)
        }, { merge: true });
    } catch (error) {
        console.error("Erreur stopTimer:", error);
    }
}

// Enregistrer le temps passé (appel périodique pour plus de précision)
let intervalTimers = {};

export function startPeriodicTimer(pageId, intervalSeconds = 30) {
    if (intervalTimers[pageId]) return;
    
    startTimer(pageId);
    intervalTimers[pageId] = setInterval(() => {
        stopTimer(pageId);
        startTimer(pageId);
    }, intervalSeconds * 1000);
}

export function stopPeriodicTimer(pageId) {
    if (intervalTimers[pageId]) {
        clearInterval(intervalTimers[pageId]);
        delete intervalTimers[pageId];
    }
    stopTimer(pageId);
}

// Obtenir le nombre total de chapitres terminés
export async function getTotalChapitresTermines() {
    const progression = await getProgression();
    let total = 0;
    if (progression && progression.progression) {
        for (const matiere in progression.progression) {
            const termines = progression.progression[matiere]?.termines || [];
            total += termines.length;
        }
    }
    return total;
}

// Obtenir le temps total d'étude (en secondes)
export async function getTempsTotalEtude() {
    const progression = await getProgression();
    let total = 0;
    if (progression && progression.tempsParPage) {
        for (const page in progression.tempsParPage) {
            total += progression.tempsParPage[page];
        }
    }
    return total;
}

// Vérifier si un chapitre est terminé
export async function isChapitreTermine(coursId, chapitreId) {
    const progression = await getProgression();
    if (!progression || !progression.progression) return false;
    const termines = progression.progression[coursId]?.termines || [];
    return termines.includes(chapitreId);
}