(() => {
  const data = window.EverytimeData;
  if (!data) return;

  function clamp(n) {
    return Math.max(0, Math.min(255, n | 0));
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function roundRect(ctx, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
  }

  const LAYOUT = {
    c1: [0.28, 0.26],
    c2: [0.58, 0.24],
    c5: [0.84, 0.22],
    c8: [0.14, 0.52],
    c7: [0.46, 0.5],
    c6: [0.22, 0.8],
    c4: [0.55, 0.82],
    c3: [0.84, 0.74],
  };

  window.renderReviewVoronoi = function renderReviewVoronoi(wrapEl, opts) {
    if (!wrapEl) return;
    opts = opts || {};
    const picker = !!opts.picker;
    wrapEl.innerHTML = "";
    wrapEl.classList.add("ab-map-stage");
    const parent = wrapEl.closest(".ab-map-card") || wrapEl.parentElement;
    const cssW = picker ? Math.max(620, Math.min(760, (parent?.clientWidth || 720) - 24)) : Math.max(760, Math.min(1000, (parent?.clientWidth || 960) - 48));
    const cssH = picker ? 360 : 540;
    const PX = 2;
    const W = cssW * PX;
    const H = cssH * PX;
    const rng = mulberry32(20260902);
    const pickedSet = picker ? opts.selected : null;
    const dimOthers = !!(pickedSet && pickedSet.size > 0);

    const grouped = {};
    data.reviews.forEach((r) => {
      (grouped[r.cluster] ||= []).push(r);
    });

    const macros = data.clusters.map((c) => {
      const count = (grouped[c.id] || []).length;
      const loc = LAYOUT[c.id] || c.seed;
      return {
        id: c.id,
        label: c.label,
        pct: c.pct,
        color: c.color,
        x: loc[0] * W,
        y: loc[1] * H,
        weight: Math.pow(Math.max(count, 1), 0.38),
        reviews: grouped[c.id] || [],
      };
    });

    function warp(x, y) {
      return [x + Math.sin(y * 0.009 + 1.1) * 28, y + Math.sin(x * 0.008 + 2.2) * 24];
    }

    function nearestMacro(px, py) {
      const w = warp(px, py);
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < macros.length; i++) {
        const dx = w[0] - macros[i].x;
        const dy = w[1] - macros[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) / macros[i].weight;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    }

    const STEP = 2;
    const cols = Math.ceil(W / STEP);
    const rows = Math.ceil(H / STEP);
    const macroGrid = new Int16Array(cols * rows);

    function fillMacroGrid() {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          macroGrid[j * cols + i] = nearestMacro(i * STEP + 1, j * STEP + 1);
        }
      }
    }

    fillMacroGrid();
    for (let iter = 0; iter < 2; iter++) {
      const sx = new Float64Array(macros.length);
      const sy = new Float64Array(macros.length);
      const n = new Float64Array(macros.length);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const m = macroGrid[j * cols + i];
          sx[m] += i * STEP;
          sy[m] += j * STEP;
          n[m] += 1;
        }
      }
      macros.forEach((m, idx) => {
        if (n[idx] > 0) {
          m.x = sx[idx] / n[idx];
          m.y = sy[idx] / n[idx];
        }
      });
      fillMacroGrid();
    }

    const buckets = macros.map(() => []);
    for (let j = 0; j < rows; j += 2) {
      for (let i = 0; i < cols; i += 2) {
        buckets[macroGrid[j * cols + i]].push([i * STEP + 1, j * STEP + 1]);
      }
    }

    const micros = [];
    macros.forEach((m, mi) => {
      const revs = m.reviews.length ? m.reviews : [{ title: m.label, body: m.label, snippet: m.label, nick: "", rating: 0, date: "" }];
      const pool = buckets[mi];
      const used = new Set();
      revs.forEach((r) => {
        let x = m.x;
        let y = m.y;
        if (pool.length) {
          let pick = pool[Math.floor(rng() * pool.length)];
          for (let t = 0; t < 24; t++) {
            const cand = pool[Math.floor(rng() * pool.length)];
            const key = cand[0] + "," + cand[1];
            if (!used.has(key)) {
              pick = cand;
              used.add(key);
              break;
            }
          }
          x = pick[0];
          y = pick[1];
        }
        micros.push({ x, y, r, mi });
      });
    });

    const byMacro = macros.map(() => []);
    micros.forEach((p, i) => byMacro[p.mi].push(i));

    function nearestMicro(px, py, mi) {
      const ids = byMacro[mi];
      let best = ids[0];
      let bestD = Infinity;
      for (let k = 0; k < ids.length; k++) {
        const p = micros[ids[k]];
        const dx = px - p.x;
        const dy = py - p.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = ids[k];
        }
      }
      return best;
    }

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "ab-map-canvas";
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H);
    const microAt = new Int32Array(W * H);
    const macroAt = new Int16Array(W * H);
    const area = new Float64Array(micros.length);
    const cxSum = new Float64Array(micros.length);
    const cySum = new Float64Array(micros.length);
    const mArea = new Float64Array(macros.length);
    const mxSum = new Float64Array(macros.length);
    const mySum = new Float64Array(macros.length);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const mi = macroGrid[Math.min(rows - 1, (y / STEP) | 0) * cols + Math.min(cols - 1, (x / STEP) | 0)];
        const oi = picker ? 0 : nearestMicro(x, y, mi);
        const idx = y * W + x;
        microAt[idx] = oi;
        macroAt[idx] = mi;
        area[oi] += 1;
        cxSum[oi] += x;
        cySum[oi] += y;
        mArea[mi] += 1;
        mxSum[mi] += x;
        mySum[mi] += y;
        const dim = dimOthers && !pickedSet.has(macros[mi].id);
        const base = dim ? [196, 200, 206] : macros[mi].color;
        const shade = picker || dim ? 0 : oi % 4 === 0 ? 16 : oi % 4 === 1 ? -12 : oi % 4 === 2 ? 6 : -4;
        const p = idx * 4;
        img.data[p] = clamp(base[0] + shade);
        img.data[p + 1] = clamp(base[1] + shade);
        img.data[p + 2] = clamp(base[2] + shade);
        img.data[p + 3] = 255;
      }
    }

    const EDGE = [72, 78, 90];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = y * W + x;
        const mac = macroAt[idx];
        const mic = microAt[idx];
        let cover = 0;
        if (macroAt[idx + 1] !== mac) cover++;
        if (macroAt[idx - 1] !== mac) cover++;
        if (macroAt[idx + W] !== mac) cover++;
        if (macroAt[idx - W] !== mac) cover++;
        const p = idx * 4;
        if (cover > 0) {
          const a = Math.min(0.82, 0.28 + cover * 0.22);
          img.data[p] = Math.round(img.data[p] * (1 - a) + EDGE[0] * a);
          img.data[p + 1] = Math.round(img.data[p + 1] * (1 - a) + EDGE[1] * a);
          img.data[p + 2] = Math.round(img.data[p + 2] * (1 - a) + EDGE[2] * a);
        } else if (!picker && (microAt[idx + 1] !== mic || microAt[idx + W] !== mic)) {
          const a = 0.1;
          img.data[p] = Math.round(img.data[p] * (1 - a) + 90 * a);
          img.data[p + 1] = Math.round(img.data[p + 1] * (1 - a) + 94 * a);
          img.data[p + 2] = Math.round(img.data[p + 2] * (1 - a) + 102 * a);
        }
      }
    }

    ctx.putImageData(img, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    roundRect(ctx, W, H, 44);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(2.4, 2.4);
    roundRect(ctx, W - 4.8, H - 4.8, 40);
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = "rgba(48,54,64,.55)";
    ctx.stroke();
    ctx.restore();

    if (!picker) {
      ctx.save();
      roundRect(ctx, W, H, 44);
      ctx.clip();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(28,34,44,.38)";
      ctx.font = "500 18px Pretendard, Apple SD Gothic Neo, sans-serif";
      const shown = new Set();
      macros.forEach((m, mi) => {
        const cix = mxSum[mi] / mArea[mi];
        const ciy = mySum[mi] / mArea[mi];
        const cands = micros
          .map((pt, i) => ({ i, pt, area: area[i] }))
          .filter((x) => x.pt.mi === mi && x.area >= 420)
          .map((x) => {
            const mx = cxSum[x.i] / x.area;
            const my = cySum[x.i] / x.area;
            const dx = mx - cix;
            const dy = my - ciy;
            return { ...x, mx, my, d2: dx * dx + dy * dy };
          })
          .filter((x) => x.d2 > 176 * 176)
          .sort((a, b) => b.d2 - a.d2)
          .slice(0, 8);
        cands.forEach((x) => {
          shown.add(x.i);
          const text = (x.pt.r.snippet || x.pt.r.title || "").slice(0, 14);
          ctx.fillText(text, x.mx, x.my, 200);
        });
      });
      ctx.restore();
    }

    const overlay = document.createElement("div");
    overlay.className = "ab-map-overlay";

    macros.forEach((m, mi) => {
      if (mArea[mi] < 80) return;
      const mx = mxSum[mi] / mArea[mi];
      const my = mySum[mi] / mArea[mi];
      const label = document.createElement("div");
      const on = picker && pickedSet && pickedSet.has(m.id);
      const dim = dimOthers && !on;
      label.className = "ab-cluster-label" + (on ? " on" : "") + (dim ? " dim" : "");
      label.style.left = `${(mx / W) * 100}%`;
      label.style.top = `${(my / H) * 100}%`;
      const check = picker ? `<span class="ab-check">${on ? "✓" : ""}</span>` : "";
      label.innerHTML = `${check}<b>${m.label}</b><span>${m.pct}%</span>`;
      if (picker) {
        label.style.pointerEvents = "auto";
        label.style.cursor = "pointer";
        label.addEventListener("click", (e) => {
          e.stopPropagation();
          if (opts.onSelect) opts.onSelect(m.id);
        });
      }
      overlay.appendChild(label);
    });

    const pop = document.createElement("div");
    pop.className = "speech-pop";
    pop.hidden = true;
    overlay.appendChild(pop);

    function showPop(i, clientX, clientY) {
      const r = micros[i].r;
      pop.hidden = false;
      pop.innerHTML = `<div class="speech-meta">${escapeHtml(r.date || "")}</div>
        <div class="speech-title">${escapeHtml(r.title || "")}</div>
        <div class="speech-text">${escapeHtml(r.body || "")}</div>`;
      const stage = wrapEl.getBoundingClientRect();
      let left = clientX - stage.left;
      let top = clientY - stage.top - 10;
      pop.style.left = `${left}px`;
      pop.style.top = `${top}px`;
    }

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      const y = ((e.clientY - rect.top) / rect.height) * H;
      const gi = Math.min(rows - 1, (y / STEP) | 0) * cols + Math.min(cols - 1, (x / STEP) | 0);
      const mi = macroGrid[gi];
      if (picker) {
        if (opts.onSelect) opts.onSelect(macros[mi].id);
        return;
      }
      const oi = nearestMicro(x, y, mi);
      showPop(oi, e.clientX, e.clientY);
    });

    if (!picker) {
      document.addEventListener("click", (e) => {
        if (!wrapEl.contains(e.target)) pop.hidden = true;
      });
    }

    wrapEl.appendChild(canvas);
    wrapEl.appendChild(overlay);
  };


  window.buildEverytimeReportHTML = function buildEverytimeReportHTML() {
    const sections = [
      {
        id: "c1",
        title: "시간표 및 강의평가 기능 개선 (22%)",
        insights: [
          "사용자의 학업 관리 효율성을 위해 시간표 커스터마이징(요일 선택, 테마)과 학식 위젯 등 추가적인 맞춤형 기능이 요구됩니다.",
          "강의평가 정보의 정확성을 높이기 위해 단순 삭제가 아닌 수정 기능 도입이 필요하며, 학기별 시간표 관리의 유연성이 보완되어야 합니다.",
          "수강신청 기간에 맞춘 시간표 데이터 업데이트 지연이 학생들에게 실질적인 불편을 초래하고 있어 시스템 대응 속도 개선이 시급합니다.",
        ],
        quote: "제발 요일 추가/삭제 기능 추가해주세요!!!!!!!! 이번 업데이트 너무 좋은데 딱 하나만 추가해주세요ㅠㅠㅠ 에브리타임으로 주간 일정 관리하고 싶은데 월~금, 월~토, 월~일 말고 원하는 요일로만 선택할 수 있는 기능주세요!!!!!!!!",
        suggest: "요일 자유 설정 및 시간표 수정 기능을 추가하고, 수강신청 시즌에는 데이터 업데이트 담당 인력을 증원하여 배포 속도를 최적화해야 합니다.",
      },
      {
        id: "c2",
        title: "쪽지 및 채팅 기능 오류 (20%)",
        insights: [
          "익명성 커뮤니티의 특성상 사용자 보호를 위한 쪽지 차단 및 거부 기능의 복구와 다중 삭제 기능 등 관리 편의성이 절실합니다.",
          "쪽지함 로딩 오류와 알림 미작동 등 기본적인 통신 기능의 기술적 결함이 사용자 간 소통을 심각하게 저해하고 있습니다.",
          "메시지 가독성을 떨어뜨리는 인터페이스 오류와 앱 내 불필요한 전환 애니메이션이 사용자의 피로도를 높이고 있습니다.",
        ],
        quote: "쪽지 수신차단기능 다시 만들어주세요",
        suggest: "쪽지 수신 거부 기능을 즉시 복구하고, 안정적인 로딩을 위해 서버 부하 분산 처리 및 메시지 UI 스크롤 최적화를 권장합니다.",
      },
      {
        id: "c3",
        title: "커뮤니티 관리 및 신고 기능 (13%)",
        insights: [
          "신고 누적 기능의 강화와 운영진의 신속한 대응을 통해 분란글 및 불쾌감을 주는 게시물을 체계적으로 정화해야 한다는 의견이 지배적입니다.",
          "익명성 뒤에 숨은 혐오 발언이나 사상 논란이 커뮤니티 문화를 오염시키고 있어, 건전한 정보 공유를 위한 필터링 정책 강화가 요구됩니다.",
          "좋아요 테러나 매크로 광고 등 커뮤니티 활동을 저해하는 비정상적인 행위에 대한 제재 시스템 마련이 필요합니다.",
        ],
        quote:
          "신고 누적 기능은 꼭 필요한 것 같다 방대한 양의 신고 건수를 일일이 검토하는 것은 불가능하고 특정 분란글을 지속적으로 게시하는 건이나 꼭 욕설이 들어간 것은 아니어도 불쾌감을 주는 글들이 너무 많이 올라온다..",
        suggest: "머신러닝 기반 혐오 표현 필터링 시스템을 고도화하고, 사용자 중심의 커뮤니티 관리 권한(일부 차단/신고 투명성)을 확대 운영해야 합니다.",
      },
      {
        id: "c4",
        title: "앱 접속 및 로딩 오류 (12%)",
        insights: [
          "앱 내 이미지 전송 오류, 시간표 오류 등 다양한 버그가 보고되고 있으며, 특히 위젯의 표시 오류는 사용자 접근성을 크게 떨어뜨립니다.",
          "로딩 속도 저하와 학교 포털 연동 화면의 가로 전환 불가 등 전반적인 앱 퍼포먼스 향상이 요구됩니다.",
          "특정 상황에서 발생하는 무분별한 계정 정지 조치는 사용자 신뢰를 떨어뜨리며 명확한 소명 절차의 부재를 드러내고 있습니다.",
        ],
        quote: "위젯어디감 아니 위젯 잘쓰다가 갑자기 백지되고 위젯추가도 안되는데 어디간거죠?ㅠㅠ",
        suggest: "주요 기기별 위젯 오류에 대한 전수 조사를 실시하고, 정지 처분에 대한 이의 제기 절차를 자동화된 문의 창구로 정교화해야 합니다.",
      },
      {
        id: "c5",
        title: "회원가입 및 본인인증 절차 (11%)",
        insights: [
          "재학증명서 발급 등 과도하게 까다로운 인증 절차가 사용자 진입 장벽을 높이고 있어, 모바일 학생증 활용 등 간편 인증으로의 전환이 필요합니다.",
          "회원가입 시 아이디 정책(중복 허용 등)이 너무 엄격하여 신규 사용자들의 가입 시도가 반복적으로 실패하는 문제가 발생합니다.",
          "고객센터의 부재로 인해 개명이나 학번 변경 등 인증 데이터 수정이 필요한 사용자들이 극심한 불편을 겪고 있습니다.",
        ],
        quote:
          "최악의 인증 방법 재학증명서 요구라니요. 지금까지 한번도 앱 리뷰 남겨본 적이 없는데 재학증명서 요구하는 재학생 인증방법에 어이가 없어서 리뷰 남깁니다. 학생증으로 충분하지 않을까요?",
        suggest: "인증 수단을 다양화(전자증명서, 모바일 학생증 간소화)하고, 가입 아이디 제약 조건을 완화하여 사용자 편의성을 높여야 합니다.",
      },
      {
        id: "c6",
        title: "기타 (11%)",
        insights: [
          "반수생이나 학점 교류생 등 학교 변경이 필요한 상황에서 계정 통합 및 변경 기능 부재로 인해 기존 데이터가 손실되는 비효율이 발생합니다.",
          "강의평 내 검색 기능 추가나 게시물 삭제 인터페이스의 편의성 개선 등 세부적인 기능 수정에 대한 요구가 높습니다.",
          "광고 배너의 강제적인 배치와 '닫기' 버튼의 부적절한 위치가 사용자 경험을 크게 저해하고 있습니다.",
        ],
        quote:
          "반수해서 학교 바뀌었을 때 탈퇴하고 다시 가입해야되던데 같은 계정으로 학교 변경 가능하게 해주세요 제발!!!!! 에타 친추 해놓은 사람이 한 두명도 아니고 약 50명을 어떻게 다시 하나하나 추가해요…",
        suggest: "학교 변경 시 기존 친구 및 스크랩 데이터를 유지할 수 있는 마이그레이션 기능을 도입하고, UX 최적화를 위해 광고 배치 가이드라인을 개정해야 합니다.",
      },
      {
        id: "c7",
        title: "서비스 이용 대상 확대 (6%)",
        insights: [
          "대학원생, 연세예술원생, 추합생 등 실질적인 학습 주체들이 가입 불가 대상에 포함되어 정보 소외 현상이 발생하고 있습니다.",
          "유학생 등 다양한 국적의 학생들이 서비스 사용을 원하고 있어 글로벌 확장성을 고려한 앱 접근성 개선이 필요합니다.",
        ],
        quote: "대학원생은 왜 안됨? 취지가 학생들 도움 받으라고 하는 거 아닌가요? 대학원생이 안 되는 이유나 들어봅시다…;;;",
        suggest: "서비스 대상을 대학원생 및 평생교육기관으로 확대하고, 인증 데이터베이스(DB)를 보완하여 사각지대를 해소해야 합니다.",
      },
      {
        id: "c8",
        title: "계정 정지 및 이용 제한 (5%)",
        insights: [
          "명확한 근거 없는 무분별한 계정 정지 사례가 보고되고 있으며, 특히 정치적 의견이나 개인적인 게시물에 대한 신고 기반 자동 정지에 대한 불만이 큽니다.",
          "운영진의 소통 창구 부족과 일방적인 제재 방식이 사용자들과의 신뢰 관계를 무너뜨리고 있습니다.",
        ],
        quote: "무지성 정지 좀 해결해라 쓰레기 놈들아 정치게시판에 정치 의견 냈다고 정지 먹는게 맞냐? 그냥 지들 의견이랑 다르다고 무지성 신고 박히고 정지 되는 쓰레기 시스템",
        suggest: "제재 사유를 구체적으로 안내하는 자동 알림 시스템을 도입하고, 정지 해제 신청 절차를 투명하게 공개하여 공정성을 확보해야 합니다.",
      },
    ];

    return `
      <div class="result-toolbar">
        <span class="result-tool">병합</span>
        <span class="result-tool">정렬</span>
        <span class="result-tool">테이블 복사</span>
        <span class="result-tool">CSV 저장</span>
      </div>
      <div class="result-body">
        <div class="r-title">에브리타임 서비스 개선 요구 분석</div>
        <div class="r-divider"></div>
        <p class="r-lead">에브리타임 사용자들의 핵심 요구사항을 분석한 결과, 시간표 및 커뮤니티 기능의 개인화, 쪽지·채팅 시스템의 안정성, 그리고 가입 인증 절차의 유연성 확보가 시급한 것으로 나타났습니다.</p>
        ${sections
          .map(
            (s) => `
          <div class="r-h2">${s.title}</div>
          <div class="r-h3">Key Insights</div>
          <ul class="r-list">${s.insights.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
          <div class="para-evidences" id="evidences-default-${s.id}">
            <div class="evidence-item"><span class="evidence-text">"${escapeHtml(s.quote)}"</span><button type="button" class="evidence-remove" onclick="this.parentElement.remove()">✕</button></div>
          </div>
          <div class="link-row"><button type="button" class="link-btn" onclick="openEvidenceModal('default-${s.id}','t${s.id}')">근거 연결</button></div>
          <p class="r-suggest"><b>제안:</b> ${escapeHtml(s.suggest)}</p>
        `
          )
          .join("")}
      </div>`;
  };
})();
