# 이미지 사용 가이드라인

## 폴더 구조

```
DesignerPortfolio/
├── images/
│   ├── profile/        # 프로필 사진
│   ├── portfolio/      # 포트폴리오 작업물 이미지
│   ├── background/     # 배경 이미지 및 비디오 썸네일
│   └── icons/          # 아이콘, 로고 등 UI 에셋
├── css/
├── js/
└── index.html
```

## 파일 명명 규칙

- 소문자와 하이픈(`-`)만 사용. 공백, 한글, 대문자 금지.
  - 좋음: `profile-photo.jpg`, `project-branding-01.png`
  - 나쁨: `프로필 사진.jpg`, `ProjectBranding.PNG`
- 번호가 있는 경우 두 자리 패딩 사용: `01`, `02`, ... `10`

## 권장 파일 형식

| 용도 | 형식 | 이유 |
|------|------|------|
| 포트폴리오 작업물 | `.webp` (fallback: `.jpg`) | 압축률 우수 |
| 투명 배경 필요 | `.webp` (fallback: `.png`) | 투명도 지원 |
| 아이콘 / 로고 | `.svg` | 해상도 독립적 |
| 배경 이미지 | `.webp` (fallback: `.jpg`) | 고압축 |

## 이미지 크기 기준

- **포트폴리오 카드 이미지**: 최대 1200×800px, 200KB 이하
- **프로필 사진**: 최대 600×600px, 100KB 이하
- **배경 이미지**: 최대 1920×1080px, 500KB 이하
- 원본은 별도 보관하고, 웹용으로 압축한 파일을 `images/` 폴더에 넣는다.

## HTML에서 이미지 삽입 방법

### 기본 삽입 (portfolio.html 카드 등)
```html
<img src="images/portfolio/project-branding-01.webp"
     alt="브랜딩 프로젝트 01"
     width="1200"
     height="800"
     loading="lazy">
```
- `alt` 속성은 반드시 작성 (접근성 + SEO)
- `width` / `height` 명시로 레이아웃 시프트(CLS) 방지
- 화면 밖 이미지에는 `loading="lazy"` 적용

### 배경 이미지 (CSS에서)
```css
/* portfolio.css 또는 style.css */
.card-thumbnail {
    background-image: url("../images/portfolio/project-branding-01.webp");
    background-size: cover;
    background-position: center;
}
```
- CSS 파일 기준 상대 경로 사용 (`../images/...`)

### WebP + 구형 브라우저 대응 (선택 사항)
```html
<picture>
    <source srcset="images/portfolio/project-branding-01.webp" type="image/webp">
    <img src="images/portfolio/project-branding-01.jpg"
         alt="브랜딩 프로젝트 01"
         width="1200"
         height="800"
         loading="lazy">
</picture>
```

## 경로 작성 규칙

| 파일 위치 | 이미지 경로 작성 |
|-----------|-----------------|
| `index.html` (루트) | `images/portfolio/file.webp` |
| `css/style.css` | `../images/portfolio/file.webp` |
| 루트의 다른 `.html` | `images/portfolio/file.webp` |

## 이미지 최적화 도구 (권장)

- **Squoosh** (브라우저): squoosh.app — WebP 변환 및 압축
- **SVGO**: SVG 파일 최적화
- 목표: 육안으로 품질 차이를 느끼지 못하는 범위에서 최대한 압축
