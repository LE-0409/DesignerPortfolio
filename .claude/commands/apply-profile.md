`user-profile.md`를 읽고 `Index.html`을 아래 규칙에 따라 업데이트하세요.

## 실행 순서

1. `user-profile.md` 파일을 읽는다.
2. `images/profile/` 폴더를 Glob으로 탐색해 첫 번째 이미지 파일 경로를 가져온다. 파일이 없으면 프로필 사진 부분은 건드리지 않는다.
3. `Index.html`을 읽는다.
4. 아래 규칙에 따라 수정한다.
5. 수정된 내용을 저장한다.

## 수정 규칙

### `<title>` 태그
`[이름] — Designer` 형식으로 변경한다.

### 프로필 사진
- 이미지 파일이 존재하면: `.profile-photo` div 내부의 placeholder div 두 개를 `<img src="[경로]" alt="[이름]">` 단일 태그로 교체한다.
- 이미지 파일이 없으면: 변경하지 않는다.

### 프로필 텍스트
- `.profile-eyebrow`: 직함으로 교체
- `.profile-name`: `[성]<br><em>[이름]</em>` 형식으로 교체 (이름이 한 단어면 `[이름]<br><em></em>` 처리)
- `.profile-bio`: 바이오 항목들을 `<br>` 로 연결해 교체. 개수에 관계없이 목록 전체를 반영한다.

### 스킬 태그
`.profile-tags` 내부 `<span>` 목록 전체를 user-profile.md의 스킬 태그로 재생성한다.

### 필터 버튼
`.filter-bar` 내부를 카드 목록에서 사용된 카테고리를 기반으로 재생성한다.
- 첫 번째 버튼은 항상 `ALL` (`data-filter="all"`, `active` 클래스 포함)
- 이후 버튼은 카드 목록에 등장하는 카테고리를 **첫 등장 순서**대로 중복 없이 생성한다.
- 버튼의 표시 텍스트는 해당 카테고리의 첫 번째 카드 태그 텍스트를 사용한다.

```html
<button class="filter-btn active" data-filter="all">ALL</button>
<button class="filter-btn" data-filter="[카테고리]">[태그 텍스트]</button>
```

### 포트폴리오 카드
`.cylinder-carousel` 내부의 `.work-card` 목록 전체를 아래 구조로 재생성한다.
- `bg-N` 클래스는 카드 순서에 따라 1부터 순번을 매기되, 8을 초과하면 1부터 다시 순환한다. (예: 9번째 카드 → `bg-1`, 10번째 → `bg-2`)
- 제목의 `/`는 `<br>`로 변환한다.

```html
<div class="work-card" data-category="[카테고리]">
  <div class="card-bg bg-[N]"></div>
  <div class="card-body">
    <span class="card-tag">[태그]</span>
    <h3>[제목 줄1]<br>[제목 줄2]</h3>
    <p class="card-year">[연도]</p>
  </div>
</div>
```

### 연락처
- `mailto:` 링크의 href와 `.ci-value` 텍스트를 이메일로 교체
- `tel:` 링크의 href(숫자와 `+`만 사용)와 `.ci-value` 텍스트를 전화번호로 교체
- `.social-links` 내부 전체를 user-profile.md의 소셜 링크 목록으로 재생성한다. 개수에 관계없이 목록에 있는 항목 수만큼 생성한다.

```html
<a href="[URL]" class="social-link">[표시 이름]</a>
```

### 푸터
`© [연도] [이름]. All rights reserved.` 형식으로 교체한다. 연도는 현재 연도를 사용한다.
