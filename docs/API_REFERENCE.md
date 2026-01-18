# 📚 API Reference — Fair Meeting Point Finder

## Обзор

FMPF использует **Yandex Maps JavaScript API 2.1** для:
1. Отображения карты
2. Геокодирования адресов
3. Построения маршрутов
4. Расчёта времени в пути

## Требования к API ключу

### Необходимые сервисы

При создании ключа в [Кабинете разработчика](https://developer.tech.yandex.ru/) включите:

- ✅ **JavaScript API** — для карты
- ✅ **HTTP Геокодер** — для поиска адресов  
- ✅ **Маршрутизация** — для построения маршрутов

### Ограничения (Бесплатный тариф)

| Сервис | Лимит | Примечание |
|--------|-------|------------|
| JS API | Без ограничений | Отображение карты |
| Геокодер | 1000/день | ~1₽ за превышение |
| Маршруты | 1000/день | ~5₽ за превышение |

⚠️ **Важно:** Тарифы и лимиты могут меняться. Проверяйте актуальную информацию на сайте Яндекса.

## Используемые API методы

### 1. Карта (ymaps.Map)

```javascript
const map = new ymaps.Map('map', {
  center: [55.751244, 37.618423], // Москва
  zoom: 11,
  controls: ['zoomControl', 'typeSelector', 'fullscreenControl', 'rulerControl']
}, {
  suppressMapOpenBlock: true // Убираем всплывающее окно
});
```

### 2. Геокодирование (ymaps.geocode)

```javascript
const result = await ymaps.geocode('Москва, Красная площадь');
const firstGeoObject = result.geoObjects.get(0);

if (firstGeoObject) {
  const coords = firstGeoObject.geometry.getCoordinates();
  // [55.7539, 37.6208]
  
  const address = firstGeoObject.getAddressLine();
  // "Россия, Москва, Красная площадь"
}
```

**Учёт в статистике:** 1 запрос геокодера

### 3. Маршрутизация (ymaps.multiRouter.MultiRoute)

#### Общественный транспорт

```javascript
const multiRoute = new ymaps.multiRouter.MultiRoute({
  referencePoints: [
    [55.751244, 37.618423], // from
    [55.758950, 37.601190]  // to
  ],
  params: {
    routingMode: 'masstransit' // ОТ
  }
}, {
  boundsAutoApply: false
});

multiRoute.model.events.add('requestsuccess', () => {
  const activeRoute = multiRoute.getActiveRoute();
  const duration = activeRoute.properties.get('duration');
  console.log(duration.text); // "25 мин"
  console.log(duration.value); // 1500 (секунды)
});
```

#### Автомобиль

```javascript
const multiRoute = new ymaps.multiRouter.MultiRoute({
  referencePoints: [from, to],
  params: {
    routingMode: 'auto' // Авто с учётом пробок
  }
});
```

**Учёт в статистике:** 1 запрос маршрута

### 4. Извлечение сегментов маршрута

```javascript
const activeRoute = multiRoute.getActiveRoute();
const segments = [];

activeRoute.getPaths().each(path => {
  path.getSegments().each(segment => {
    const props = segment.properties.getAll();
    
    segments.push({
      type: props.type, // 'pedestrian', 'masstransit', 'transfer'
      duration: props.duration?.value, // секунды
      transports: props.transports // [{type: 'bus', name: 'А11'}]
    });
  });
});
```

### 5. Типы транспорта

| API Type | Отображение | Описание |
|----------|-------------|----------|
| `pedestrian` | 🚶 walk | Пешком |
| `bus` | 🚌 bus | Автобус |
| `trolleybus` | 🚎 trolleybus | Троллейбус |
| `tram` | 🚊 tram | Трамвай |
| `underground` | 🚇 metro | Метро |
| `suburban` | 🚆 suburban | МЦД, электрички |
| `minibus` | 🚌 bus | Маршрутка |
| `transfer` | 🔄 transfer | Пересадка |

### 6. Маркеры (ymaps.Placemark)

```javascript
const marker = new ymaps.Placemark(coords, {
  iconCaption: 'Андрей',
  balloonContent: '<strong>Андрей</strong><br>Москва'
}, {
  preset: 'islands#circleIcon',
  iconColor: '#3b82f6'
});

map.geoObjects.add(marker);
```

## Обработка ошибок

### Геокодер

```javascript
try {
  const result = await ymaps.geocode(query);
  if (!result.geoObjects.get(0)) {
    throw new Error('Адрес не найден');
  }
} catch (e) {
  console.error('Geocode error:', e);
}
```

### Маршрутизация

```javascript
model.events.add('requestfail', (event) => {
  const error = event.get('error');
  console.error('Route error:', error);
  // Возможные ошибки:
  // - Маршрут не найден
  // - Превышен лимит запросов
  // - Сетевая ошибка
});
```

### Таймауты

FMPF реализует собственные таймауты:

```javascript
const timeout = setTimeout(() => {
  // Маршрут не ответил за N мс
  stats.route.timeout++;
  resolve({ ok: false, error: 'timeout' });
}, timeoutMs);
```

## Оптимизация запросов

### 1. Геометрическая предфильтрация

До обращения к API фильтруем кандидатов математически:

```javascript
// Не запрашиваем маршруты к точкам:
// - Дальше 30 км от центроида
// - Дальше 2.5× от самой удалённой точки участника
```

**Экономия:** 30-50% запросов

### 2. Кеширование (Планируется)

```javascript
const cacheKey = `${from}|${to}|${transport}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 3. Батчинг (Ограничение API)

Yandex API не поддерживает батч-запросы маршрутов. Каждый маршрут — отдельный запрос.

**Workaround:** Distance Matrix API (платный, не в стандартном пакете).

## Примерная стоимость

| Действие | Запросов | ~Стоимость |
|----------|----------|------------|
| Добавить точку по адресу | 1 geocode | 0.001₽ |
| Поиск (3 участника, 6×6) | ~180 route | 0.9₽ |
| Поиск (4 участника, 6×6) | ~240 route | 1.2₽ |
| Построить маршруты | N route | N × 0.005₽ |

⚠️ Цены примерные и могут отличаться от актуальных.

## Безопасность ключа

### ❌ Плохо

```html
<script src="https://api-maps.yandex.ru/2.1/?apikey=YOUR_KEY"></script>
```

Ключ виден в исходном коде страницы.

### ✅ Лучше

```javascript
// Ключ вводит пользователь, хранится в localStorage
const key = localStorage.getItem('fmp_apikey');
const script = document.createElement('script');
script.src = `https://api-maps.yandex.ru/2.1/?apikey=${key}`;
```

### ✅✅ Идеально (для продакшена)

```javascript
// Серверный прокси
const response = await fetch('/api/route', {
  method: 'POST',
  body: JSON.stringify({ from, to })
});
// Сервер добавляет ключ и проксирует запрос
```

## Ссылки

- [Yandex Maps JS API 2.1](https://yandex.ru/dev/maps/jsapi/)
- [Геокодер](https://yandex.ru/dev/maps/geocoder/)
- [Маршрутизатор](https://yandex.ru/dev/maps/router/)
- [Кабинет разработчика](https://developer.tech.yandex.ru/)
