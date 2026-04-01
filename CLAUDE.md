# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 안내를 제공합니다.

## 프로젝트 개요

빌드 시스템과 의존성이 없는 정적 포트폴리오 웹사이트입니다. `Index.html` 또는 `portfolio.html`을 브라우저에서 직접 열면 실행됩니다.

## 아키텍처

두 페이지로 구성된 사이트:

- **`Index.html` + `style.css`**: 비디오 배경, 고정 헤더, 햄버거 버튼으로 토글되는 사이드 메뉴가 있는 랜딩 페이지. 메뉴 토글은 체크박스 기반 CSS로 동작하며 JS가 필요 없음. 사이드 메뉴는 글래스모피즘 효과(backdrop-filter blur) 적용.
- **`portfolio.html` + `portfolio.css`**: 3D 캐러셀 슬라이더가 있는 포트폴리오 페이지. 카드는 뷰포트 내 위치에 따라 동적으로 크기가 변함(center/side/back 상태). 드래그 스크롤 및 관성 스크롤은 파일 내 바닐라 JS로 구현.

공통 스타일(로고, 내비게이션, 헤더, 오버레이, 메뉴)은 `style.css`에, 캐러셀 전용 스타일은 `portfolio.css`에 위치합니다.

## 디자인 토큰

- 배경색: `#020617`
- 강조색: `#00cfff`
- 폰트: SUIT (JSDelivr CDN으로 로드)
- 다크 테마, 시안 계열 강조색, 그라디언트 카드
