(() => {
  const { appResultUrl, sourceLabels } = window.AffinityData;
  const projects = window.AffinityData.projects;

  const state = {
    currentTab: "all",
    selectedId: "p1",
    addSeq: 0,
    wiz: { isNewProject: false, step: 1, items: [], lens: "주제별", uploading: [] },
  };

  const el = {
    switcherBtn: document.getElementById("switcherBtn"),
    switcherName: document.getElementById("switcherName"),
    switchPanel: document.getElementById("switchPanel"),
    backdrop: document.getElementById("backdrop"),
    searchInput: document.getElementById("searchInput"),
    projectList: document.getElementById("projectList"),
    analysisList: document.getElementById("analysisList"),
    wizBackdrop: document.getElementById("wizBackdrop"),
    wizName: document.getElementById("wizName"),
    wizStepper: document.getElementById("wizStepper"),
    wizDone: document.getElementById("wizDone"),
    newProjectName: document.getElementById("newProjectName"),
    nameNextBtn: document.getElementById("nameNextBtn"),
    wizProjectLabel: document.getElementById("wizProjectLabel"),
    wizBackBtn: document.getElementById("wizBackBtn"),
    wizNextBtn: document.getElementById("wizNextBtn"),
    dsSearch: document.getElementById("dsSearch"),
    dsList: document.getElementById("dsList"),
    uploadList: document.getElementById("uploadList"),
    selCountNote: document.getElementById("selCountNote"),
    confirmProject: document.getElementById("confirmProject"),
    confirmData: document.getElementById("confirmData"),
    confirmLens: document.getElementById("confirmLens"),
    bubbleName: document.getElementById("bubbleName"),
    wizDoneSub: document.getElementById("wizDoneSub"),
  };

  const tabIds = { all: "tabAll", fav: "tabFav", recent: "tabRecent" };

  function currentProject() {
    return projects.find((p) => p.id === state.selectedId);
  }

  function projectName() {
    if (state.wiz.isNewProject) {
      return el.newProjectName.value.trim() || "새 프로젝트";
    }
    return currentProject()?.name || "프로젝트";
  }

  function setTab(tab) {
    state.currentTab = tab;
    Object.entries(tabIds).forEach(([key, id]) => {
      document.getElementById(id).classList.toggle("active", key === tab);
    });
    renderProjects();
  }

  function filteredProjects() {
    const q = el.searchInput.value.trim().toLowerCase();
    return projects.filter((p) => {
      if (state.currentTab === "fav" && !p.fav) return false;
      if (state.currentTab === "recent" && !p.recent) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderProjects() {
    const list = filteredProjects();
    if (!list.length) {
      el.projectList.innerHTML = '<div class="empty-hint">해당하는 프로젝트가 없어요.</div>';
    } else {
      el.projectList.innerHTML = list
        .map(
          (p) => `<button type="button" class="proj-row${p.id === state.selectedId ? " selected" : ""}" data-project="${p.id}">
            <div class="proj-row-top"><span class="proj-name">${p.name}</span>${p.fav ? '<span class="star">★</span>' : ""}</div>
            <span class="proj-meta">${p.meta}</span>
          </button>`
        )
        .join("");
    }

    if (!list.find((p) => p.id === state.selectedId) && list.length) {
      selectProject(list[0].id);
    } else {
      renderAnalyses();
    }
  }

  function renderAnalyses() {
    const p = currentProject();
    if (!p) {
      el.analysisList.innerHTML = '<div class="empty-hint">왼쪽에서 프로젝트를 선택해주세요.</div>';
      return;
    }
    el.analysisList.innerHTML = p.analyses
      .map(
        (a) => `<button type="button" class="an-row" data-open-app>
          <div class="an-name">${a.name}</div>
          <div class="an-meta">${a.meta}</div>
        </button>`
      )
      .join("");
  }

  function selectProject(id) {
    state.selectedId = id;
    const p = currentProject();
    if (p) el.switcherName.textContent = p.name;
    renderProjects();
  }

  function togglePanel() {
    const willOpen = !el.switchPanel.classList.contains("show");
    el.switchPanel.classList.toggle("show", willOpen);
    el.backdrop.classList.toggle("show", willOpen);
    el.switcherBtn.classList.toggle("open", willOpen);
  }

  function hideWizardPanes() {
    el.wizName.classList.remove("show");
    el.wizStepper.classList.remove("show");
    el.wizDone.classList.remove("show");
  }

  function openWizard(isNewProject) {
    state.wiz = { isNewProject, step: 1, items: [], lens: "주제별", uploading: [] };
    state.addSeq = 0;
    el.wizBackdrop.classList.add("show");
    hideWizardPanes();

    document.querySelectorAll(".persp-tabs button").forEach((btn, i) => {
      btn.classList.toggle("on", i === 0);
    });
    document.getElementById("lensDetail").value = "주제에 따라 5개에서 9개의 덩어리로 분류해줘";
    document.getElementById("labelDetail").value = "~해요.체로 적어줘";
    el.bubbleName.value = "";

    if (isNewProject) {
      el.wizName.classList.add("show");
      el.newProjectName.value = "";
      el.nameNextBtn.disabled = true;
    } else {
      startStepper();
    }
    el.dsSearch.value = "";
    el.uploadList.innerHTML = "";
    renderSavedData();
  }

  function closeWizard() {
    el.wizBackdrop.classList.remove("show");
  }

  function goToStepper() {
    el.wizName.classList.remove("show");
    startStepper();
  }

  function startStepper() {
    el.wizStepper.classList.add("show");
    el.wizProjectLabel.textContent = `${projectName()} · 버블 만들기`;
    goStep(1);
  }

  function goStep(n) {
    state.wiz.step = n;
    [1, 2, 3].forEach((i) => {
      document.getElementById(`stepBody${i}`).style.display = i === n ? "block" : "none";
      const dot = document.getElementById(`dot${i}`);
      dot.classList.remove("on", "done");
      if (i < n) dot.classList.add("done");
      if (i === n) dot.classList.add("on");
    });
    el.wizBackBtn.disabled = n === 1;
    el.wizNextBtn.textContent = n === 3 ? "버블 만들기" : "다음";
    if (n === 3) fillConfirm();
  }

  function stepNext() {
    if (state.wiz.step < 3) goStep(state.wiz.step + 1);
    else createBubble();
  }

  function stepBack() {
    if (state.wiz.step > 1) goStep(state.wiz.step - 1);
  }

  function renderSavedData() {
    const q = el.dsSearch.value.trim().toLowerCase();
    const list = state.wiz.items.filter((d) => !q || d.name.toLowerCase().includes(q));
    if (!list.length) {
      el.dsList.innerHTML = '<div class="empty-hint">왼쪽에서 데이터를 추가하면 여기에 나타나요.</div>';
    } else {
      el.dsList.innerHTML = list
        .map(
          (d) => `<button type="button" class="ds-row${d.checked ? " checked" : ""}" data-item="${d.id}">
            <span class="ds-check">${d.checked ? "✓" : ""}</span>
            <div><div class="ds-name">${d.name}</div><div class="ds-meta">${d.meta}</div></div>
          </button>`
        )
        .join("");
    }
    updateSelCount();
  }

  function toggleItem(id) {
    const item = state.wiz.items.find((x) => x.id === id);
    if (item) item.checked = !item.checked;
    renderSavedData();
  }

  function updateSelCount() {
    const n = state.wiz.items.filter((d) => d.checked).length;
    el.selCountNote.textContent = `선택됨 ${n}개`;
  }

  function addSource(type) {
    state.addSeq += 1;
    const src = sourceLabels[type];
    const id = `add${state.addSeq}`;
    const name = src.name(state.addSeq);
    const row = { id, name, icon: src.icon, pct: 20 };
    state.wiz.uploading.push(row);
    renderUploads();
    const timer = window.setInterval(() => {
      row.pct += 30;
      if (row.pct >= 100) {
        row.pct = 100;
        window.clearInterval(timer);
        state.wiz.items.push({ id, name, meta: "2026-08-26 · 지금 추가됨", checked: true });
        renderSavedData();
      }
      renderUploads();
    }, 350);
  }

  function renderUploads() {
    el.uploadList.innerHTML = state.wiz.uploading
      .map((u) => {
        const done = u.pct >= 100;
        return `<div class="upload-row"><span class="upload-doc-icon">${u.icon}</span>
          <div class="upload-info"><div class="upload-name">${u.name}</div>
          <div class="upload-bar"><div class="upload-bar-fill" style="width:${u.pct}%;"></div></div></div>
          <span class="upload-status ${done ? "done" : "ing"}">${done ? "저장됨" : "업로드 중"}</span></div>`;
      })
      .join("");
  }

  function pickLens(btn) {
    document.querySelectorAll(".persp-tabs button").forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    state.wiz.lens = btn.textContent.trim();
  }

  function fillConfirm() {
    el.confirmProject.textContent = projectName();
    const picked = state.wiz.items.filter((d) => d.checked).map((d) => d.name);
    el.confirmData.textContent = picked.length ? `${picked.join(", ")} (총 ${picked.length}개)` : "선택된 데이터 없음";
    el.confirmLens.textContent = state.wiz.lens;
    if (!el.bubbleName.value) el.bubbleName.value = `${state.wiz.lens} 분석`;
  }

  function createBubble() {
    const bubbleName = el.bubbleName.value.trim() || `${state.wiz.lens} 분석`;
    const totalCount = state.wiz.items.filter((d) => d.checked).length;
    const today = "2026.08.26";
    const meta = `데이터 ${totalCount}개 조합 · ${today} 생성`;

    if (state.wiz.isNewProject) {
      const name = projectName();
      const newId = `p${projects.length + 1}_${Date.now()}`;
      projects.unshift({
        id: newId,
        name,
        meta: `${today} 수정`,
        fav: false,
        recent: true,
        analyses: [{ name: bubbleName, meta }],
      });
      state.selectedId = newId;
      el.switcherName.textContent = name;
      el.wizDoneSub.innerHTML = `<b>${name}</b> 프로젝트가 만들어지고,<br>첫 버블 <b>${bubbleName}</b>이 저장됐어요.`;
    } else {
      const p = currentProject();
      p.analyses.unshift({ name: bubbleName, meta });
      p.meta = `${today} 수정`;
      el.wizDoneSub.innerHTML = `<b>${p.name}</b>에 새 버블<br><b>${bubbleName}</b>이 추가됐어요.`;
    }

    hideWizardPanes();
    el.wizDone.classList.add("show");
    el.bubbleName.value = "";
    renderProjects();
  }

  function goToApp() {
    window.location.href = appResultUrl;
  }

  function bindEvents() {
    el.searchInput.addEventListener("input", renderProjects);
    el.dsSearch.addEventListener("input", renderSavedData);
    el.newProjectName.addEventListener("input", (e) => {
      el.nameNextBtn.disabled = e.target.value.trim().length === 0;
    });

    document.body.addEventListener("click", (event) => {
      const target = event.target.closest(
        "[data-action], [data-tab], [data-project], [data-source], [data-item], [data-lens], [data-open-app]"
      );
      if (!target) return;

      if (target.dataset.action === "toggle-panel") togglePanel();
      else if (target.dataset.action === "open-wizard") openWizard(target.dataset.new === "true");
      else if (target.dataset.action === "close-wizard") closeWizard();
      else if (target.dataset.action === "go-stepper") goToStepper();
      else if (target.dataset.action === "step-back") stepBack();
      else if (target.dataset.action === "step-next") stepNext();
      else if (target.dataset.action === "go-app") goToApp();
      else if (target.dataset.tab) setTab(target.dataset.tab);
      else if (target.dataset.project) selectProject(target.dataset.project);
      else if (target.dataset.source) addSource(target.dataset.source);
      else if (target.dataset.item) toggleItem(target.dataset.item);
      else if (target.dataset.lens !== undefined) pickLens(target);
      else if (target.dataset.openApp !== undefined) goToApp();
    });
  }

  bindEvents();
  renderProjects();
})();
