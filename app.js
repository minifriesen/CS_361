const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "simplelists_v5";

let state = {
  currentUser: null,
  data: loadData(),
  selectedListId: null,
  activeCategory: null
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? JSON.parse(raw)
      : { users: {} };
  } catch {
    return { users: {} };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

// Ensure test account
if (!state.data.users.test) {
  state.data.users.test = {
    password: "1234",
    lists: [],
    categories: [],
  };
  saveData();
}

/* ---------------- Screen Helpers ---------------- */
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  $(`screen-${name}`).classList.remove("hidden");
}

function doLogout() {
  state.currentUser = null;
  document.querySelectorAll(".nav-btn").forEach((b) => (b.hidden = true));
  $("nav-welcome").hidden = false;
  showScreen("welcome");
}

/* ---------------- Navigation ---------------- */
$("nav-welcome").addEventListener("click", () => showScreen("welcome"));
$("nav-home").addEventListener("click", () => showScreen("home"));
$("nav-about").addEventListener("click", () => showScreen("about"));
$("nav-logout").addEventListener("click", doLogout);

/* ---------------- Welcome Screen ---------------- */
$("btn-get-started").addEventListener("click", () => showScreen("login"));
$("btn-go-signup").addEventListener("click", () => showScreen("signup"));

/* ---------------- Signup ---------------- */
$("btn-create-account").addEventListener("click", () => {
  const u = $("su-username").value.trim();
  const p = $("su-password").value.trim();
  const msg = $("su-msg");
  msg.textContent = "";

  if (!u || !p) return (msg.textContent = "Enter username and password.");
  if (state.data.users[u]) return (msg.textContent = "Username already exists.");

  state.data.users[u] = {
    password: p,
    lists: [],
    categories: [],
  };
  saveData();
  msg.textContent = "Account created. You can now log in.";
  setTimeout(() => showScreen("login"), 1000);
});

/* ---------------- Login ---------------- */
$("btn-login").addEventListener("click", () => {
  const u = $("li-username").value.trim();
  const p = $("li-password").value.trim();
  const msg = $("li-msg");
  msg.textContent = "";

  if (!u || !p) return (msg.textContent = "Enter username and password.");
  const user = state.data.users[u];
  if (!user || user.password !== p)
    return (msg.textContent = "Invalid username or password.");

  state.currentUser = u;
  state.activeCategory = null;
  $("nav-home").hidden = false;
  $("nav-about").hidden = false;
  $("nav-user").hidden = false;
  $("nav-logout").hidden = false;
  $("nav-user").textContent = u;

  renderCategoriesSidebar();
  renderHome();
  showScreen("home");
});

function renderHome(filterCat = state.activeCategory) {
  if (!state.currentUser) return;

  const heading = $("lists-heading");
  const cont = $("lists-container");
  cont.innerHTML = "";

  // If no category is selected, show a message and exit
  if (!filterCat) {
    cont.innerHTML = `<div class="micro">No category selected...</div>`;
    return;
  } else if (filterCat === "All") {
    heading.textContent = "All Lists";
  } else {
    heading.textContent = `${filterCat} Lists`;
  }

  const lists = state.data.users[state.currentUser].lists;
  const searchTerm = ($("search-input")?.value || "").toLowerCase();

  let filtered = lists;
  if (filterCat !== "All") filtered = filtered.filter((l) => l.category === filterCat);
  if (searchTerm)
    filtered = filtered.filter((l) => l.name.toLowerCase().includes(searchTerm));

  if (filtered.length === 0) {
    cont.innerHTML = `<div class="micro">No lists found in this category.</div>`;
    return;
  }

  filtered.forEach((l) => {
    const node = document.importNode($("tpl-list-card").content, true);
    node.querySelector(".title").textContent = l.name;
    node.querySelector(".cat").textContent = l.category ? `Category: ${l.category}` : "";

    // Open button
    node.querySelector(".open-btn").addEventListener("click", () => openList(l.id));

    // Edit button
    node.querySelector(".edit-btn").addEventListener("click", () => {
      const newName = prompt("Edit list:", l.name);
      if (!newName) return;
      l.name = newName.trim();
      saveData();
      renderHome(filterCat);
    });

    // Delete button
    node.querySelector(".delete-btn").addEventListener("click", () => {
      if (!confirm(`Are you sure you want to delete "${l.name}"? 
        
--Deleting the list will remove list data--`
      )) return;
      const lists = state.data.users[state.currentUser].lists;
      const idx = lists.findIndex((x) => x.id === l.id);
      if (idx !== -1) lists.splice(idx, 1);
      saveData();
      renderHome(filterCat);
    });

    cont.appendChild(node);
  });
}

/* Create List */
$("btn-create-list").addEventListener("click", () => {
  if (!state.currentUser) return alert("Please login first.");
  const name = $("create-name").value.trim();
  if (!name) return alert("Enter a list name.");

  const cat = document.querySelector(".category-item.active")?.dataset.cat?.trim();
  const lists = state.data.users[state.currentUser].lists;

  if (lists.some((l) => l.name.toLowerCase() === name.toLowerCase()))
    return alert("List name already exists.");

  const newList = { id: Date.now(), name, category: cat || "Uncategorized", tasks: [] };
  lists.push(newList);
  saveData();
  $("create-name").value = "";
  renderHome(cat || "All");
});

/* ---------------- Sidebar & Search ---------------- */
function renderCategoriesSidebar() {
  const ul = $("category-list-sidebar");
  ul.innerHTML = "";
  const userCats = state.data.users[state.currentUser].categories || [];
  const allCats = ["All", ...userCats];

  allCats.forEach((cat) => {
    const li = document.createElement("li");
    li.textContent = cat;
    li.className = "category-item";
    li.dataset.cat = cat;

    // Only mark active if a category is selected
    if (cat === state.activeCategory) {
      li.classList.add("active");
    }

    li.addEventListener("click", () => {
      state.activeCategory = cat;
      document.querySelectorAll(".category-item").forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
      renderHome(cat); // render lists after selecting a category
    });

    ul.appendChild(li);
  });
}

$("btn-back-from-signup").addEventListener("click", () => {
  showScreen("welcome");
});

/* ---------------- Add Category Modal ---------------- */
const modal = $("category-modal");
const modalInput = $("modal-category-input");
const modalSubmit = $("modal-submit-category");
const modalCancel = $("modal-cancel-category");

$("btn-open-category-modal").addEventListener("click", () => {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  modalInput.value = "";
  modalInput.focus();
});

modal.querySelectorAll(".rec-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    modalInput.value = btn.textContent;
  });
});

modalCancel.addEventListener("click", () => {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
});

modalSubmit.addEventListener("click", () => {
  const name = modalInput.value.trim();
  if (!name) return alert("Please enter a category name.");

  const userCats = state.data.users[state.currentUser].categories;
  if (!userCats.includes(name)) {
    userCats.push(name);
    saveData();
  }

  renderCategoriesSidebar();
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
});

$("search-input").addEventListener("input", () => {
  const activeCat =
    document.querySelector(".category-item.active")?.dataset.cat || "All";
  renderHome(activeCat);
});

/* ---------------- List Screen ---------------- */
function openList(id) {
  const list = getList(id);
  if (!list) return;
  state.selectedListId = id;
  $("list-title").textContent = list.name;
  $("list-category").textContent = list.category || "(none)";
  renderTasks(list);
  showScreen("list");
}

$("btn-back-to-home-from-list").addEventListener("click", () => {
  renderHome();
  showScreen("home");
});

$("btn-add-task").addEventListener("click", () => {
  const text = $("new-task-text").value.trim();
  if (!text) return;
  const list = getList(state.selectedListId);
  list.tasks.push(text);
  saveData();
  $("new-task-text").value = "";
  renderTasks(list);
});

function renderTasks(list) {
  const ul = $("tasks-ul");
  ul.innerHTML = "";
  list.tasks.forEach((t, i) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "0.5rem";

    const span = document.createElement("span");
    span.textContent = t;
    span.style.flex = "1";
    li.appendChild(span);

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "edit-btn";
    editBtn.addEventListener("click", () => {
      const newText = prompt("Edit task:", list.tasks[i]);
      if (!newText) return;
      list.tasks[i] = newText.trim();
      saveData();
      renderTasks(list);
    });
    li.appendChild(editBtn);

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "danger";
    delBtn.addEventListener("click", () => {
      list.tasks.splice(i, 1);
      saveData();
      renderTasks(list);
    });
    li.appendChild(delBtn);

    ul.appendChild(li);
  });
}

/* ---------------- Edit / Delete ---------------- */
function getList(id) {
  return state.data.users[state.currentUser].lists.find((l) => l.id === id);
}

/* ---------------- Init ---------------- */
showScreen("welcome");
