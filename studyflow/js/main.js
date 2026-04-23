(() => {
  const SUBJECT_COLORS = {
    Math: "hsl(232 60% 28%)",
    Science: "hsl(152 45% 42%)",
    History: "hsl(12 78% 62%)",
    English: "hsl(265 50% 50%)",
    Other: "hsl(230 12% 42%)",
  };

  const state = {
    tasks: JSON.parse(localStorage.getItem("studyflow.tasks") || "[]"),
    sessions: parseInt(localStorage.getItem("studyflow.sessions") || "0", 10),
    filter: "all",
    sort: "due",
  };

  const save = () => {
    localStorage.setItem("studyflow.tasks", JSON.stringify(state.tasks));
    localStorage.setItem("studyflow.sessions", String(state.sessions));
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const formatDue = (d) => {
    if (d === todayStr()) return "Today";
    return new Date(d + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // ---------- Task form ----------
  const dueInput = document.getElementById("task-due");
  dueInput.value = todayStr();

  document.getElementById("task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("task-title").value.trim();
    if (!title) return;
    state.tasks.unshift({
      id: crypto.randomUUID(),
      title,
      subject: document.getElementById("task-subject").value,
      due: dueInput.value,
      done: false,
      createdAt: Date.now(),
    });
    document.getElementById("task-title").value = "";
    save();
    render();
  });

  // ---------- Filters / sort ----------
  document.getElementById("filter-group").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    state.filter = btn.dataset.filter;
    document.querySelectorAll("#filter-group button").forEach((b) =>
      b.classList.toggle("active", b === btn)
    );
    render();
  });

  const sortBtn = document.getElementById("sort-btn");
  sortBtn.addEventListener("click", () => {
    state.sort = state.sort === "due" ? "subject" : "due";
    sortBtn.textContent = `Sort: ${state.sort}`;
    render();
  });

  // ---------- Render ----------
  const list = document.getElementById("task-list");
  const empty = document.getElementById("empty-state");

  function render() {
    // Stats
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.done).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const dueToday = state.tasks.filter((t) => !t.done && t.due === todayStr()).length;
    document.getElementById("stat-completed").textContent = `${done}/${total}`;
    document.getElementById("stat-due").textContent = dueToday;
    document.getElementById("stat-progress").textContent = `${pct}%`;
    document.getElementById("progress-fill").style.width = `${pct}%`;
    document.getElementById("session-count").textContent = state.sessions;

    // Filter + sort
    let items = state.tasks.filter((t) =>
      state.filter === "all" ? true : state.filter === "done" ? t.done : !t.done
    );
    items.sort((a, b) =>
      state.sort === "due" ? a.due.localeCompare(b.due) : a.subject.localeCompare(b.subject)
    );

    list.innerHTML = "";
    empty.style.display = items.length === 0 ? "block" : "none";

    items.forEach((t) => {
      const li = document.createElement("li");
      li.className = "task" + (t.done ? " done" : "");
      li.innerHTML = `
        <button class="check" aria-label="Toggle complete">${t.done ? "✓" : ""}</button>
        <span class="dot" style="background:${SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.Other}"></span>
        <div class="body">
          <p class="title"></p>
          <p class="meta"></p>
        </div>
        <div class="actions">
          <button class="edit" aria-label="Edit">✎</button>
          <button class="del" aria-label="Delete">🗑</button>
        </div>
      `;
      li.querySelector(".title").textContent = t.title;
      li.querySelector(".meta").textContent = `${t.subject} · ${formatDue(t.due)}`;

      li.querySelector(".check").addEventListener("click", () => {
        t.done = !t.done; save(); render();
      });
      li.querySelector(".del").addEventListener("click", () => {
        state.tasks = state.tasks.filter((x) => x.id !== t.id); save(); render();
      });
      li.querySelector(".edit").addEventListener("click", () => {
        const body = li.querySelector(".body");
        const input = document.createElement("input");
        input.type = "text"; input.value = t.title; input.className = "edit";
        body.replaceChildren(input);
        input.focus();
        const finish = (commit) => {
          if (commit && input.value.trim()) t.title = input.value.trim();
          save(); render();
        };
        input.addEventListener("blur", () => finish(true));
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") finish(true);
          if (e.key === "Escape") finish(false);
        });
      });

      list.appendChild(li);
    });
  }

  // ---------- Pomodoro ----------
  const modeGroup = document.getElementById("mode-group");
  const display = document.getElementById("timer-display");
  const labelEl = document.getElementById("timer-label");
  const fill = document.getElementById("timer-fill");
  const startBtn = document.getElementById("start-btn");
  const resetBtn = document.getElementById("reset-btn");

  let total = 1500, remaining = 1500, running = false, intervalId = null, modeLabel = "Focus";

  const updateDisplay = () => {
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    display.textContent = `${mm}:${ss}`;
    fill.style.width = `${((total - remaining) / total) * 100}%`;
    labelEl.textContent = `${modeLabel} session`;
  };

  const stop = () => { running = false; startBtn.textContent = "▶ Start"; if (intervalId) clearInterval(intervalId); };

  startBtn.addEventListener("click", () => {
    if (running) { stop(); return; }
    running = true; startBtn.textContent = "⏸ Pause";
    intervalId = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        stop(); remaining = 0; updateDisplay();
        if (modeLabel === "Focus") {
          state.sessions++; save(); render();
          alert("Focus session complete — nice work!");
        }
        return;
      }
      updateDisplay();
    }, 1000);
  });

  resetBtn.addEventListener("click", () => { stop(); remaining = total; updateDisplay(); });

  modeGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    document.querySelectorAll("#mode-group button").forEach((b) => b.classList.toggle("active", b === btn));
    total = parseInt(btn.dataset.seconds, 10);
    remaining = total;
    modeLabel = btn.textContent.trim();
    stop(); updateDisplay();
  });

  updateDisplay();
  render();
})();
