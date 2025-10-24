# Еволюція HyperFrame після переходу на універсальний sandbox

> Коротко: замість окремих p5/Three оболонок тепер маємо один універсальний рантайм, який вміє працювати з будь-яким візуальним стеком у iframe.

## 1. Основна ідея

- **HyperFrame контролює iframe.** Він дзеркалить стилі зі Studio, підключає бібліотеку контролів та малює віджет експорту (PNG + WebM).
- **Запуск відбувається через `window.hyperFrame.createSandbox({ ... })`.** У конфіг можна передати залежності, визначення контролів, опції експорту й `setup(context)`.
- **`context` у `setup` дає:**
  - `mount` – DOM-вузол для вашого рендера.
  - `params` – актуальні значення контролів.
  - `controls` – хендл панелі (якщо описані контролі).
  - `exports` – API для скріншотів та запису відео.
  - `environment` – доступ до `window`, `document`, `onResize`, `addCleanup`.
- **Ніяких обов'язкових `sketch.ts` / `main.tsx`.** Структуруйте файли так, як зручно конкретному пресету (React, Pixi, чистий WebGL, SVG тощо).

## 2. Контролі

- Описуємо параметри через `controlDefinitions` та передаємо їх у `createSandbox({ controls: { definitions, options } })`.
- У рендері читаємо `context.params`. Якщо потрібні івенти — передаємо `onChange(change, context)`.
- Не імпортуємо Tweakpane напряму. Міст HyperFrame робить це сам через `window.hypertoolControls`.

## 3. Експорт

- За замовчуванням активований `useDefaultCanvasCapture` — віджет шукає перший `<canvas>` у `mount`.
- Можна підмінити поведінку:
  ```ts
  context.exports.registerImageCapture(async () => canvasRef);
  context.exports.registerVideoCapture({ requestStream: () => canvasRef.captureStream(60) });
  context.exports.setFilename('my-visual');
  context.exports.setVisible(false); // якщо малюєте власний UI
  ```

## 4. Залежності та стилі

- Зовнішні CDN підключаємо через `dependencies: [{ type: 'script' | 'style', url, ... }]`.
- Стилі Studio (Tailwind-токени, шрифти) підтягуються автоматично завдяки дзеркалу CSS.

## 5. Життєвий цикл

- `setup(context)` може повернути функцію очищення.
- Додаткові чистки/лістенери — через `context.environment.addCleanup` та `context.environment.onResize`.

## 6. Робочий процес

1. Створюємо потрібну структуру файлів.
2. Описуємо `controlDefinitions` (якщо треба).
3. Викликаємо `window.hyperFrame.createSandbox({ ... })` у вхідній точці.
4. У `setup` монтуємо UI/рендер, реагуємо на `params`, конфігуруємо `exports`.
5. Не правимо `__hypertool__/…` — системні бандли підклеюються автоматично.

## 7. AI та промпти

- `src/config/prompts.js` тепер говорить моделі про універсальний sandbox. Якщо відповідь знову повертає `hyperFrame.p5.start`, варто регенерувати.
- Патчі йдуть з шляхами `/file.ts`. Системні файли фільтруються на бекенді.

Таким чином HyperFrame перетворився на легку, але універсальну оболонку: він займається стилями, контролями, експортуванням і завантаженням залежностей, а творчий код лишається повністю на стороні пресету.
