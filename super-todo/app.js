// localStorage のキー(data-schema.md と同期)
const STORAGE_KEY = "super-todo:v1";

// 初期 state
const initialState = {
  tasks: [],
};

// === State 読み書き ===
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : structuredClone(initialState);
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// === ビジネスロジック(純粋関数) ===
// TODO: addTask, toggleTask, removeTask など。state を受け取って次の state を返す形で書く

// === レンダリング ===
function render(state) {
  // TODO: state を読んで DOM を更新
}

// === 初期化 ===
let state = loadState();
render(state);
