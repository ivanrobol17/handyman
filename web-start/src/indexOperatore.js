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
  where,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { getMessaging, getToken, onwork } from 'firebase/messaging';
import { getPerformance } from 'firebase/performance';

import { getFirebaseConfig } from './firebase-config.js';
let nomeOperatore = prompt("inserire in nome Operatore");
let intestazione = true;
let ordine = ["nome", "cognome", "numero", "email", "indirizzo", "lavoro", "ore", "descrizione"] // array con salvato tutti i campi e ordinati
onSnapshot(richiestaServerAssignedWork(), function (snapshot) { // per i lavori assegnati ma non completati
  if (intestazione) {
    stampaIntestazione(1);
  }
  snapshot.docChanges().forEach(function (change) {
    if (change.doc.data().operatore == nomeOperatore) {
      if (change.type == "removed") {//se viene cancellato qualcosa allora lo cancello dal dom e dalla base dati
        deletework(change.doc.id, 1);
      } else { // altrimenti lo scrivo nell'array e lo metto nel DOM
        let dato = change.doc.data();
        dato.id = change.doc.id;
        displayWork(change.doc.id, dato);
      }
    }
  });
})
onSnapshot(richiestaServerDoneWork(), function (snapshot) { // per tutti i lavori conclusi
  if (intestazione) {
    stampaIntestazione(3);
    intestazione = false;
  }
  snapshot.docChanges().forEach(function (change) {
    if (change.doc.data().operatore == nomeOperatore) {
      if (change.type == "removed") {//se viene cancellato qualcosa allora lo cancello anche dal dom
        deletework(change.doc.id, 3);
      } else {
        console.log(change.type)
        let dato = change.doc.data();
        displayDoneWork(change.doc.id, dato);
      } 
    }
  });
})
function deletework(id, type) { // metodo per cancellare un elemento del dom
  var div = document.getElementById(id);
  // If an element for that work exists we delete it.
  if (div) {
    if (type == 1) {
      document.getElementById("lavoriAssegnati").removeChild(div);
    } else {
      document.getElementById("lavoriConclusi").removeChild(div);
    }
  }
}
function displayWork(id, work) { // metodo per stampare un lavoro non finito
  let contenitore = document.createElement("div");//creo un div che contiene tutti i dati di un lavoro
  contenitore.id = id;
  contenitore.className = "richiesta";
  ordine.forEach(etichetta => { // popolo il div con i campi
    let cella = document.createElement("div");
    cella.className = etichetta;
    let testo = null;
    let s = "";
    if (etichetta == "lavoro" && typeof work[etichetta] != "string") { // se sono nel campo lavoro controllo se è uno solo (allora ha tipo string) o sono di più (allora è un Array)
      work[etichetta].forEach(lav => { s += lav + ", "; })// scrivo il nome di ogni lavoro nella variablie s
      testo = document.createTextNode(s);//aggiungo al dom la stringa s
    } else { // in tutti gli altri casi lo aggiungo al dom
      testo = document.createTextNode(work[etichetta]);
    }
    cella.appendChild(testo);
    contenitore.appendChild(cella);
  })
  let cella = document.createElement("div");
  cella.className = "operatore";
  let dettagli = document.createElement("input");
  dettagli.className = "btn";
  dettagli.type = "button";
  dettagli.value = "concludi";
  cella.appendChild(dettagli);
  contenitore.appendChild(cella);
  document.getElementById("lavoriAssegnati").appendChild(contenitore);
  dettagli.addEventListener('click', () => { //quando viene premuto il pulsante creo un div che contiene tutti i campi da riempire prima di salvare
    let cont = document.createElement("div");
    cont.className = "cont";
    let btn = document.createElement("button");
    btn.className = "chiudi"
    let txt = document.createTextNode("x");
    btn.appendChild(txt);
    cont.appendChild(btn);
    btn.addEventListener("click", () => {
      document.body.removeChild(cont);
    })
    let titolo = document.createElement("h3");
    titolo.className = "titoloDiv"
    txt = document.createTextNode("Inserisci Dati");
    titolo.appendChild(txt);
    cont.appendChild(titolo);
    let dataInizio = document.createElement("input");
    dataInizio.className = "interazione";
    dataInizio.type = "date";
    dataInizio.placeholder = "data inizio";
    cont.appendChild(dataInizio);
    let dataFine = document.createElement("input");
    dataFine.className = "interazione";
    dataFine.type = "date";
    dataFine.placeholder = "data fine";
    cont.appendChild(dataFine);
    let problemi = document.createElement("input");
    problemi.className = "interazione";
    problemi.type = "text";
    problemi.placeholder = "problemi";
    cont.appendChild(problemi);
    let materiali = document.createElement("input");
    materiali.className = "interazione";
    materiali.type = "text";
    materiali.placeholder = "materiali usati";
    cont.appendChild(materiali);
    if (typeof work.lavoro != "string") {
      work["lavoro"].forEach(testo => {
        let tempo = document.createElement("input");
        tempo.id = "tempo" + testo;
        tempo.className = "interazione";
        tempo.type = "number";
        tempo.min = "0";
        tempo.step = "0.5";
        tempo.placeholder = "tempo " + testo;
        cont.appendChild(tempo);
      })
    } else {
      let tempo = document.createElement("input");
      tempo.id = "tempo";
      tempo.className = "interazione";
      tempo.type = "number";
      tempo.min = "0";
      tempo.step = "0.5";
      tempo.placeholder = "tempo totale";
      cont.appendChild(tempo);
    }
    let conferma = document.createElement("input"); // creo un pulsante per quando l'operatore ha finito di inserire i dati
    conferma.className = "button";
    conferma.type = "button";
    conferma.value = "conferma";
    cont.appendChild(conferma);
    document.body.appendChild(cont);
    console.log("inserire dettagli")
    conferma.addEventListener('click', () => { // quando viene premuto il puslante salvo i dati e li invio al db calcolandomi il prezzo finale
      work.inizioLavori = dataInizio.value;
      work.fineLavori = dataFine.value;
      work.problematiche = problemi.value;
      work.materiali = materiali.value;
      let sum = 0;
      let time = 0;
      let tmp = null;

      if (typeof work.lavoro != "string") {
        work["lavoro"].forEach(testo => {
          tmp = document.getElementById("tempo" + testo)
          if (work.lavoro == "tinteggiatura") { //calcolo il prezzo
            sum += Number(tmp.value) * 90;
          } else if (Number(tmp.value) <= 2) {
            sum += 250;
          } else {
            sum += 250 + ((Number(tmp.value) - 2) * 110);
          }
          time += Number(tmp.value);
        })
      } else {
        tmp = document.getElementById("tempo")
        if (work.lavoro == "tinteggiatura") { //calcolo il prezzo
          sum = Number(tmp.value) * 90;
        } else if (Number(tmp.value) <= 2) {
          sum = 250;
        } else {
          sum = 250 + ((Number(tmp.value) - 2) * 110);
        }
        time += Number(tmp.value);
      }
      console.log(time + " = " + sum);
      console.log(id);
      console.log(work);
      work.oreFinale = time;
      console.log(id);
      console.log(work);
      work.prezzoFinale = sum;
      console.log(id);
      console.log(work);
      salvataggioDoneWork(work, id)
    })
  })
}
function displayDoneWork(id, work) {
  let contenitore = document.createElement("div");//creo un div che contiene tutti i dati di un lavoro
  contenitore.id = id;
  contenitore.className = "richiesta";
  ordine.forEach(etichetta => { // popolo il div con i campi
    let cella = document.createElement("div");
    cella.className = etichetta;
    let testo = null;
    let s = "";
    if (etichetta == "lavoro" && typeof work[etichetta] != "string") { // se sono nel campo lavoro controllo se è uno solo (allora ha tipo string) o sono di più (allora è un Array)
      work[etichetta].forEach(lav => { s += lav + ", "; })// scrivo il nome di ogni lavoro nella variablie s
      testo = document.createTextNode(s);//aggiungo al dom la stringa s
    } else { // in tutti gli altri casi lo aggiungo al dom
      testo = document.createTextNode(work[etichetta]);
    }
    cella.appendChild(testo);
    contenitore.appendChild(cella);
  })
  // inserisco il pulsante per visualizzare i dettagli
  let cella = document.createElement("div");
  cella.className = "operatore";
  let btn = document.createElement("input");
  btn.type = "button";
  btn.value = "dettagli";
  btn.className = "btn";
  cella.appendChild(btn);
  contenitore.appendChild(cella);
  btn.addEventListener('click', () => { // quando viene premuto il pulsante dettagli stampo i dettagli in un div
    let cont = document.createElement("div");
    cont.className = "cont";
    let btn = document.createElement("button");
    btn.className = "chiudi"
    let txt = document.createTextNode("x");
    btn.appendChild(txt);
    cont.appendChild(btn);
    btn.addEventListener("click", () => { // quando schiacci la x si chiude il div
      document.body.removeChild(cont);
    })
    //inserimento dei dati
    let titolo = document.createElement("h3");
    titolo.className = "titoloDiv"
    txt = document.createTextNode("Dettagli");
    titolo.appendChild(txt);
    cont.appendChild(titolo);
    let testo = document.createElement("p")
    testo.className = "descriz";
    txt = document.createTextNode("data di inizio lavori: " + work.inizioLavori);
    testo.appendChild(txt)
    cont.appendChild(testo);
    testo = document.createElement("p")
    testo.className = "descriz";
    txt = document.createTextNode("data di fine lavori: " + work.fineLavori);
    testo.appendChild(txt)
    cont.appendChild(testo);
    testo = document.createElement("p")
    testo.className = "descriz";
    txt = document.createTextNode("problematiche: " + work.problematiche);
    testo.appendChild(txt)
    cont.appendChild(testo);
    testo = document.createElement("p")
    testo.className = "descriz";
    txt = document.createTextNode("materiali usati: " + work.materiali);
    testo.appendChild(txt)
    cont.appendChild(testo);
    testo = document.createElement("p")
    testo.className = "descriz";
    txt = document.createTextNode("tempo di lavoro: " + work.oreFinale + " h");
    testo.appendChild(txt)
    cont.appendChild(testo);
    testo = document.createElement("p")
    testo.className = "descriz";
    txt = document.createTextNode("prezzo finale: " + work.prezzoFinale + "$");
    testo.appendChild(txt)
    cont.appendChild(testo);
    document.body.appendChild(cont);
  })
  document.getElementById("lavoriConclusi").appendChild(contenitore);
}

function stampaIntestazione(type) { // metodo che permette di stampare l'intestazione
  let contenitore = document.createElement("div");
  contenitore.className = "intestazioneRichiesta";
  ordine.forEach(etichetta => { // stampo ogni etichetta
    let cella = document.createElement("div");
    cella.className = etichetta;
    let testo = document.createTextNode(etichetta);
    cella.appendChild(testo);
    contenitore.appendChild(cella);
  })
  //aggiungo la "colonna" di operatore
  let cella = document.createElement("div");
  cella.className = "operatore";
  let testo = document.createTextNode("concludi");
  cella.appendChild(testo);
  contenitore.appendChild(cella);
  if (type == 1) {
    document.getElementById("lavoriAssegnati").appendChild(contenitore)
  } else {
    document.getElementById("lavoriConclusi").appendChild(contenitore)
  }
}
function richiestaServerAssignedWork() {
  return query(collection(getFirestore(), 'assignedWork'), orderBy('operatore', 'desc')); //query di richiesta al db
}
function richiestaServerDoneWork() {
  return query(collection(getFirestore(), 'doneWork'), orderBy('fineLavori', 'desc'), limit(10)); //query di richiesta al db
}
async function salvataggioDoneWork(datiLavoro, id) {
  try {
    await addDoc(collection(getFirestore(), 'doneWork'), datiLavoro); //salvo il lavoro nell'array dei lavori con un operatore assegnato
    await deleteDoc(doc(getFirestore(), 'assignedWork', id)); //lo rimuovo dall'altro array
  }
  catch (error) {
    console.error('Error writing new message to Firebase Database', error);
  }
}