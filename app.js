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
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

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
const usersCol = collection(db, "users");
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();


// --- 메모 목록 ---
// Firestore에서 실시간으로 받아온 값을 여기에 담아 둡니다.
// createdAt 은 메모를 쓴 시각(밀리초)입니다. 이 값으로 순서를 정합니다.
let memos = [];

// 로그인한 사람의 역할("student" | "teacher"). 로그인 전에는 null입니다.
// 선생님으로 바꾸는 건 Firebase 콘솔에서 users/{uid} 문서를 직접 고쳐야 합니다.
let currentRole = null;


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
// 누가 썼는지(uid)를 함께 저장합니다. 로그인하지 않으면 쓸 수 없습니다.
function addMemo(text) {
  // 5글자 이상일 때만 Firestore에 저장합니다.
  if (!text || text.trim().length < 5) {
    return;
  }

  if (!auth.currentUser) {
    return;
  }

  // Firestore 규칙이 createdAt을 서버 시각(timestamp)으로 강제하므로
  // Date.now() 대신 serverTimestamp()를 씁니다.
  addDoc(memosCol, {
    text: text,
    createdAt: serverTimestamp(),
    uid: auth.currentUser.uid
  });
}

// 메모를 지웁니다.
// 선생님만 지울 수 있습니다 (Firestore 규칙이 막아서, 학생 계정으로 호출해도 거부됩니다).
function deleteMemo(id) {
  deleteDoc(doc(db, "memos", id));
}

// createdAt은 예전 메모(숫자)와 새 메모(Firestore Timestamp)가 섞여 있을 수 있어
// 둘 다 밀리초 숫자로 맞춰 줍니다.
function toMillis(value) {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return typeof value === "number" ? value : Date.now();
}

// Firestore 변화를 실시간으로 지켜보다가, 바뀔 때마다 memos를 채우고 화면을 다시 그립니다.
function watchMemos() {
  const memosQuery = query(memosCol, orderBy("createdAt"));
  onSnapshot(memosQuery, function (snapshot) {
    memos = snapshot.docs.map(function (docSnap) {
      // 방금 쓴 메모는 서버 응답 전이라 createdAt이 아직 없을 수 있어
      // { serverTimestamps: "estimate" } 로 내 컴퓨터 시각을 임시로 채웁니다.
      const data = docSnap.data({ serverTimestamps: "estimate" });
      return {
        id: docSnap.id,
        text: data.text,
        createdAt: toMillis(data.createdAt)
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

  // × 버튼은 선생님한테만 보여줍니다. (학생은 지울 수 없습니다)
  if (currentRole === "teacher") {
    const del = document.createElement("button");
    del.textContent = "×";
    del.addEventListener("click", function () {
      deleteMemo(memo.id);
    });
    div.appendChild(del);
  }

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

    if (!auth.currentUser) {
      alert("메모를 쓰려면 먼저 구글로 로그인해 주세요.");
      return;
    }

    const text = input.value.trim();
    if (text.length < 5) {
      alert("메모는 5글자 이상 입력해 주세요.");
      return;
    }

    addMemo(text);
    input.value = "";
  }
});


// ===================================================
// 구글 로그인
// ===================================================

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");

loginBtn.addEventListener("click", function () {
  signInWithPopup(auth, googleProvider);
});

logoutBtn.addEventListener("click", function () {
  signOut(auth);
});

// 처음 로그인한 사람이면 users/{uid} 문서를 만들어 둡니다.
// 항상 role: "student"로 시작합니다. 선생님으로 바꾸는 건
// Firebase 콘솔에서 문서를 직접 고쳐야 합니다 (여기서는 절대 안 건드립니다).
async function ensureUserDoc(user) {
  const userRef = doc(usersCol, user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, { role: "student" });
    return "student";
  }
  return snap.data().role;
}

// 로그인 상태가 바뀔 때마다 버튼, 이름, role을 다시 확인하고 화면을 그립니다.
onAuthStateChanged(auth, async function (user) {
  if (user) {
    userName.textContent = user.displayName + "님";
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
    currentRole = await ensureUserDoc(user);
  } else {
    userName.textContent = "";
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    currentRole = null;
  }
  render();
});


// 첫 화면 그리기 (Firestore에서 값이 오면 render()가 자동으로 불립니다)
watchMemos();
input.focus();
