window.AffinityData = {
  appResultUrl: "affinity-bubble-app.html",
  projects: [
    {
      id: "p1",
      name: "에브리타임 2.0.0",
      meta: "2026.08.20 수정",
      fav: true,
      recent: true,
      analyses: [
        { name: "게시물 관리 및 작성", meta: "응답 1,284건 · 08.20 수정" },
        { name: "결제창", meta: "응답 1,284건 · 08.18 수정" },
        { name: "광고 게시물", meta: "응답 1,284건 · 08.12 수정" },
      ],
    },
    {
      id: "p2",
      name: "머핀",
      meta: "2026.08.15 수정",
      fav: false,
      recent: true,
      analyses: [{ name: "사용자 인터뷰 분석", meta: "응답 42건 · 08.15 수정" }],
    },
    {
      id: "p3",
      name: "당근 마켓",
      meta: "2026.07.30 수정",
      fav: true,
      recent: false,
      analyses: [
        { name: "주제별 분석", meta: "응답 620건 · 07.30 수정" },
        { name: "감정 분석", meta: "응답 620건 · 07.22 수정" },
      ],
    },
    {
      id: "p4",
      name: "에브리타임 1.0.0",
      meta: "2026.07.10 수정",
      fav: false,
      recent: false,
      analyses: [{ name: "주제별 분석", meta: "응답 88건 · 07.10 수정" }],
    },
  ],
  sourceLabels: {
    upload: { icon: "📄", name: (n) => `신규_업로드_${n}.csv` },
    appreview: { icon: "📱", name: (n) => `앱스토어 리뷰 (실시간 수집 ${n})` },
    youtube: { icon: "▶", name: (n) => `유튜브 댓글 (실시간 수집 ${n})` },
    sample: { icon: "✨", name: (n) => `샘플 데이터 ${n}` },
  },
  lenses: ["주제별", "사용자인터뷰", "퍼소나", "키워드", "+ 새 관점"],
};
