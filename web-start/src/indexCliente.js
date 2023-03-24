// import per salvare sul database firestore
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getPerformance } from 'firebase/performance';

import { getFirebaseConfig } from './firebase-config.js';

function inizio() {
  const firebaseAppConfig = getFirebaseConfig();
  initializeApp(firebaseAppConfig);
}
// gestione form per la richiesta del preventivo
let richiesta = document.getElementById("inviaRichiesta");
let stampaPreventivo = document.getElementById("risultatoPreventivo");
// quando si preme il pulsante
richiesta.addEventListener("click", () => {
  let sceltaLavoro=[];
  // controllo quale lavoro è stato scelto
  for (let option of Array.from(document.getElementById("lavoro"))) {
    if (option.selected) {
      sceltaLavoro.push(option.value);
      console.log(option.value)
    }
  }
  let ore = document.getElementById("nHour").value;
  //creo l'oggetto che salvero nel database
  let richiesta = {
    nome: document.getElementById("firstName").value,
    cognome: document.getElementById("lastName").value,
    email: document.getElementById("email").value,
    numero: document.getElementById("telephone").value,
    lavoro: sceltaLavoro,
    ore: ore,
    indirizzo: document.getElementById("address").value,
    descrizione: document.getElementById("descrizione").value
  }
  let presenzaTutti = Object.keys(richiesta).filter(key => richiesta[key] == ''); // hight order function che si salva tutte le etichette dei campi non riempiti
  if (presenzaTutti.length == 0) { // se ci sono tutti i dati allora
    let preventivo;
    if (sceltaLavoro == "tinteggiatura") { //calcolo il prezzo
      preventivo = ore * 90;
    } else if (ore <= 2) {
      preventivo = 250;
    } else {
      preventivo = 250 + ((ore - 2) * 110);
    }
    stampaPreventivo.innerHTML = ""; // scrivo nel DOM
    // inserisco il preventivo e un pulsante per inviare il ticket
    let testoPreventivo = document.createTextNode("il preventivo di spesa secondo i campi inseriti è di " + preventivo + "$. Ricordiamo che il prezzo finale potrebbe variare.");
    let pulsanteConferma = document.createElement("input");
    pulsanteConferma.value = "Invia richiesta";
    pulsanteConferma.id = "confermaLavoro";
    pulsanteConferma.type = "button";
    stampaPreventivo.style.backgroundColor = "white";
    stampaPreventivo.appendChild(testoPreventivo);
    stampaPreventivo.appendChild(pulsanteConferma);
    pulsanteConferma.addEventListener("click", () => { // quando viene premuto il pulsante
      inviaRichiestaLavori(richiesta); // invio il ticket al server e svuoto tutti i campi
      document.getElementById("firstName").value="";
      document.getElementById("lastName").value="";
      document.getElementById("email").value="";
      document.getElementById("telephone").value="";
      document.getElementById("nHour").value="";
      document.getElementById("address").value="";
      document.getElementById("descrizione").value="";
      stampaPreventivo.innerHTML = "";
    stampaPreventivo.style.backgroundColor = "transparent";
    })
  }
  else { // se manca qualche dato creo un alert
    let s="manca qualche dato!!"+"\nRiempire i seguenti campi: ";
    presenzaTutti.forEach(etichetta => {
      s+="\n   - "+etichetta+", "
    })
    alert(s) // altrimenti informo che mancano i dati
  }
})
async function inviaRichiestaLavori(datiLavoro) {
    // Add a new message entry to the Firebase database.
    try {
      await addDoc(collection(getFirestore(), 'messages'), datiLavoro);
    }
    catch (error) {
      console.error('Error writing new message to Firebase Database', error);
    }
  }