// ===================================================
// 우리 반 담벼락 - 시작점
//
// 메모를 쓰면 올린 순서대로 담벼락에 붙습니다.
// 데이터는 Firebase Firestore에 저장되어, 새로고침해도 남습니다.
// ===================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Firebase 콘솔에서 발급받은 값입니다.
// Firestore 규칙으로 접근을 막기 전까지는 누구나 읽고 쓸 수 있습니다.
const firebaseConfig = {
  apiKey: "AIzaSyC832jRRvgereRnsjsIdJFer0ydhJGl5Io",
  authDomain: "test-91279.firebaseapp.com",
  projectId: "test-91279",
  storageBucket: "test-91279.firebasestorage.app",
  messagingSenderId: "944161386979",
  appId: "1:944161386979:web:4886e24efe24cac96b70d6"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const memosCol = collection(db, "memos");


// --- 메모 목록 ---
// Firestore에서 실시간으로 받아온 값을 여기에 담아 둡니다.
// createdAt 은 메모를 쓴 시각(밀리초)입니다. 이 값으로 순서를 정합니다.
let memos = [];


// ===================================================
// 데이터를 다루는 함수 세 개
// ===================================================

// 메모를 읽어 옵니다.
// 순서는 watchMemos()의 orderBy("createdAt")으로 이미 맞춰져 있습니다.
function loadMemos() {
  return memos.slice().sort(function (a, b) {
    return a.createdAt - b.createdAt;
  });
}

// 메모를 새로 씁니다.
// 백엔드 2: 여기에 "누가 썼는지"(uid)를 함께 저장하게 됩니다.
function addMemo(text) {
  // 5글자 이상일 때만 Firestore에 저장합니다.
  if (!text || text.trim().length < 5) {
    return;
  }

  addDoc(memosCol, {
    text: text,
    createdAt: Date.now()
  });
}

// 메모를 지웁니다.
// 백엔드 2: 지금은 누구든 남의 메모를 지울 수 있습니다. 이걸 막는 것이 과제입니다.
function deleteMemo(id) {
  deleteDoc(doc(db, "memos", id));
}

// Firestore 변화를 실시간으로 지켜보다가, 바뀔 때마다 memos를 채우고 화면을 다시 그립니다.
function watchMemos() {
  const memosQuery = query(memosCol, orderBy("createdAt"));
  onSnapshot(memosQuery, function (snapshot) {
    memos = snapshot.docs.map(function (docSnap) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        text: data.text,
        createdAt: data.createdAt
      };
    });
    render();
  });
}


// ===================================================
// 화면 그리기
// ===================================================

function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  loadMemos().forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "×";
  del.addEventListener("click", function () {
    deleteMemo(memo.id);
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

input.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text.length < 5) {
      alert("메모는 5글자 이상 입력해 주세요.");
      return;
    }

    addMemo(text);
    input.value = "";
  }
});


// 첫 화면 그리기 (Firestore에서 값이 오면 render()가 자동으로 불립니다)
watchMemos();
input.focus();
