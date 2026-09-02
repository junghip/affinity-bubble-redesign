window.AffinityData = {
  appResultUrl: "affinity-bubble-app.html",
  projects: [
    {
      id: "p1",
      name: "에브리타임 사용자 피드백 분석",
      meta: "2026.08.20 수정",
      fav: true,
      recent: true,
      analyses: [
        { name: "주제별 분석 (기본)", meta: "응답 1,284건 · 08.20 수정" },
        { name: "퍼소나별 분석", meta: "응답 1,284건 · 08.18 수정" },
        { name: "키워드별 분석", meta: "응답 1,284건 · 08.12 수정" },
      ],
    },
    {
      id: "p2",
      name: "머핀 앱 온보딩 인터뷰",
      meta: "2026.08.15 수정",
      fav: false,
      recent: true,
      analyses: [{ name: "사용자 인터뷰 분석", meta: "응답 42건 · 08.15 수정" }],
    },
    {
      id: "p3",
      name: "경쟁 서비스 리뷰 분석",
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
      name: "동아리 발표 설문 결과",
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
