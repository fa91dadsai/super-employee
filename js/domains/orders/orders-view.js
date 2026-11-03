// foh-opening/js/domains/orders/orders-view.js
// Warehouse & Bar Ordering Workflow (Item Selection, Stock Tally & WhatsApp Dispatch)
(function (FOH) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const S = FOH.state;
  const { t } = FOH.i18n;
  const { el } = FOH.view;
  const SESSION_KEY = 'foh-opening.erpSession.v1';

  function isAr() {
    return FOH.i18n.lang === 'ar';
  }

  function getSession() {
    return FOH.sessionAuth ? FOH.sessionAuth.getSession() : null;
  }

  function getCurrentSuperRoleKey() {
    return FOH.roleIdentity ? FOH.roleIdentity.getCurrentSuperRoleKey() : 'staff';
  }

  function canCurrentUserAccessOrders() {
    return FOH.roleIdentity ? FOH.roleIdentity.canCurrentUserAccessOrders() : true;
  }

  function loadGov() {
    return FOH.gov ? FOH.gov.loadGov() : {};
  }

  function apiCall(u, m, d) {
    return FOH.cloudSync ? FOH.cloudSync.apiCall(u, m, d) : Promise.resolve(null);
  }

  // ---- Unified Bar & FOH Warehouse Orders Tab (`ceen-bar-orders` Full Hierarchy + FOH Store Supplies) ----
  const ORDERS_DB_KEY = 'foh-opening.ceenOrdersDB.v2';
  const ORD_UNITS = {
    bottle: 'Bottle',
    piece: 'Piece',
    kg: 'kg',
    g: 'g',
    liter: 'Litre',
    pack: 'Pack',
    box: 'Case / Box',
    bunch: 'Bunch',
    tray: 'Tray',
    bag: 'Bag',
    roll: 'Roll',
  };
  const ORD_PLURALS = {
    bottle: 'bottles',
    piece: 'pieces',
    kg: 'kg',
    g: 'g',
    liter: 'litres',
    pack: 'packs',
    box: 'cases',
    bunch: 'bunches',
    tray: 'trays',
    bag: 'bags',
    roll: 'rolls',
  };

  const ORD_SEED = {"groups":{"foh":{"name":"FOH Store Supplies","nameAr":"مستلزمات الصالة والمستودع","sub":"Napkins, candles, POS rolls, condiments & cleaning","subAr":"المناديل، الشموع، رولات الكاشير، الإضافات ومواد التعقيم","icon":"🍽","roles":["waiter","captain","supervisor","runner","host"]},"bar":{"name":"Bar","nameAr":"مشروبات البار (CEEN Bar)","sub":"Spirits, mixers & supplies","subAr":"الفودكا، الجن، التكيلا، الويسكي، البيرة، البيوريه والليكيور","icon":"🍸","roles":["bartender","supervisor"]},"wine":{"name":"Wine","nameAr":"قائمة النبيذ (CEEN Wine)","sub":"Red, white, rosé & sparkling","subAr":"النبيذ الأحمر، الأبيض، الروزيه والفوار","icon":"🍷","roles":["bartender","captain","supervisor"]},"fresh":{"name":"Fresh & Fruti Bar","nameAr":"الفروتي بار والفواكه والأعشاب","sub":"Fruit, herbs & garnish","subAr":"الفواكه الطازجة، الأعشاب، الغارنيش ومستلزمات التحضير","icon":"🍋","roles":["bartender","supervisor"]}},"categories":[{"id":"foh-0","group":"foh","name":"Paper & Napkins","nameAr":"المناديل والورقيات (Paper & Napkins)"},{"id":"foh-1","group":"foh","name":"Table & Candles","nameAr":"الشموع وتجهيز الطاولات (Table & Candles)"},{"id":"foh-2","group":"foh","name":"Station & POS","nameAr":"محطات الويتر والكاشير (Station & POS)"},{"id":"foh-3","group":"foh","name":"Condiments & Sauces","nameAr":"السكر والصلصات والإضافات (Condiments)"},{"id":"foh-4","group":"foh","name":"Sanitation & Cleaning","nameAr":"التعقيم والنظافة (Sanitation)"},{"id":"bar-0","group":"bar","name":"Vodka","nameAr":"فودكا (Vodka)"},{"id":"bar-1","group":"bar","name":"Rum","nameAr":"رم (Rum)"},{"id":"bar-2","group":"bar","name":"Gin","nameAr":"جن (Gin)"},{"id":"bar-3","group":"bar","name":"Tequila & Mezcal","nameAr":"تكيلا وميزكال (Tequila & Mezcal)"},{"id":"bar-4","group":"bar","name":"Whiskey","nameAr":"ويسكي (Whiskey)"},{"id":"bar-5","group":"bar","name":"Cognac","nameAr":"كونياك (Cognac)"},{"id":"bar-6","group":"bar","name":"Beer","nameAr":"بيرة (Beer)"},{"id":"bar-7","group":"bar","name":"Liqueurs","nameAr":"ليكيور (Liqueurs)"},{"id":"bar-8","group":"bar","name":"Purées & Juices","nameAr":"بيوريه وعصائر (Purées & Juices)"},{"id":"bar-9","group":"bar","name":"Soft Drinks","nameAr":"مشروبات غازية (Soft Drinks)"},{"id":"bar-10","group":"bar","name":"Water","nameAr":"مياه (Water)"},{"id":"bar-11","group":"bar","name":"Bitters","nameAr":"بيترز (Bitters)"},{"id":"bar-12","group":"bar","name":"Other Supplies","nameAr":"مستلزمات البار (Other Supplies)"},{"id":"wine-0","group":"wine","name":"Red Wine · France","nameAr":"نبيذ أحمر · فرنسا (Red · France)"},{"id":"wine-1","group":"wine","name":"Red Wine · Italy","nameAr":"نبيذ أحمر · إيطاليا (Red · Italy)"},{"id":"wine-2","group":"wine","name":"Red Wine · Spain","nameAr":"نبيذ أحمر · إسبانيا (Red · Spain)"},{"id":"wine-3","group":"wine","name":"New World Red","nameAr":"نبيذ أحمر · العالم الجديد (New World Red)"},{"id":"wine-4","group":"wine","name":"White Wine · France","nameAr":"نبيذ أبيض · فرنسا (White · France)"},{"id":"wine-5","group":"wine","name":"White Wine · Italy","nameAr":"نبيذ أبيض · إيطاليا (White · Italy)"},{"id":"wine-6","group":"wine","name":"White Wine · Spain","nameAr":"نبيذ أبيض · إسبانيا (White · Spain)"},{"id":"wine-7","group":"wine","name":"New World White","nameAr":"نبيذ أبيض · العالم الجديد (New World White)"},{"id":"wine-8","group":"wine","name":"Rosé","nameAr":"نبيذ روزيه (Rosé)"},{"id":"wine-9","group":"wine","name":"Sparkling Wine","nameAr":"نبيذ فوار وشامبانيا (Sparkling Wine)"},{"id":"fresh-fruit","group":"fresh","name":"Fruit & Vegetables","nameAr":"فواكه وخضار طازجة (Fruit & Veg)"},{"id":"fresh-herb","group":"fresh","name":"Herbs & Garnish","nameAr":"أعشاب وغارنيش (Herbs & Garnish)"}],"items":[{"id":"foh-001","group":"foh","cat":"foh-0","name":"Dining Napkins 40×40 (White)","ar":"مناديل سفرة 40×40 بيضاء","stock":"18","unit":"pack","stockQty":18,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"Pack of 100"},{"id":"foh-002","group":"foh","cat":"foh-0","name":"Cocktail Napkins (Black Logo)","ar":"مناديل كوكتيل سوداء بشعار المطعم","stock":"12","unit":"pack","stockQty":12,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"Pack of 250"},{"id":"foh-003","group":"foh","cat":"foh-0","name":"Wet Towels (Oshibori Scented)","ar":"مناديل معطرة للضيوف (أوشيبوري)","stock":"6","unit":"box","stockQty":6,"stockUnit":"box","stockUpdatedAt":null,"packSize":"Box of 100"},{"id":"foh-004","group":"foh","cat":"foh-0","name":"Restroom Hand Paper Towels (Z-Fold)","ar":"مناديل ورقية للحمامات Z-Fold","stock":"10","unit":"pack","stockQty":10,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"Pack of 200"},{"id":"foh-005","group":"foh","cat":"foh-1","name":"Table Candles / Unscented Tealights","ar":"شموع طاولات بدون رائحة","stock":"4","unit":"box","stockQty":4,"stockUnit":"box","stockUpdatedAt":null,"packSize":"Box of 50"},{"id":"foh-006","group":"foh","cat":"foh-1","name":"Rechargeable Table Lamp Chargers","ar":"شواحن أباجورات الطاولات اللاسلكية","stock":"14","unit":"piece","stockQty":14,"stockUnit":"piece","stockUpdatedAt":null,"packSize":"USB-C Base"},{"id":"foh-007","group":"foh","cat":"foh-1","name":"Leather Placemats (Clean Reserve)","ar":"مفارش طاولات جلدية احتياطية","stock":"45","unit":"piece","stockQty":45,"stockUnit":"piece","stockUpdatedAt":null,"packSize":"Standard Set"},{"id":"foh-008","group":"foh","cat":"foh-2","name":"Thermal POS Receipt Rolls 80mm","ar":"رولات ورق كاشير حراري 80mm","stock":"15","unit":"pack","stockQty":15,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"80mm × 80m"},{"id":"foh-009","group":"foh","cat":"foh-2","name":"Credit Card Terminal Rolls 57mm","ar":"رولات ماكينة فيزا حراري 57mm","stock":"12","unit":"pack","stockQty":12,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"57mm × 40m"},{"id":"foh-010","group":"foh","cat":"foh-2","name":"Wrapped Toothpicks & Mints","ar":"أعواد أسنان مغلفة وحلوى النعناع","stock":"5","unit":"box","stockQty":5,"stockUnit":"box","stockUpdatedAt":null,"packSize":"Box of 500"},{"id":"foh-011","group":"foh","cat":"foh-2","name":"Captain Order Pads & Waiter Pens","ar":"دفاتر طلبات كابتن وأقلام صالة","stock":"9","unit":"pack","stockQty":9,"stockUnit":"pack","stockUpdatedAt":null,"packSize":"Pack of 10"},{"id":"foh-012","group":"foh","cat":"foh-3","name":"White & Brown Sugar Sticks","ar":"أصابع سكر أبيض وبني للقهوة","stock":"8","unit":"box","stockQty":8,"stockUnit":"box","stockUpdatedAt":null,"packSize":"1000 sticks"},{"id":"foh-013","group":"foh","cat":"foh-3","name":"Sweetener Sachets (Stevia / Canderel)","ar":"أكياس سكر دايت ستيفيا","stock":"4","unit":"box","stockQty":4,"stockUnit":"box","stockUpdatedAt":null,"packSize":"500 sachets"},{"id":"foh-014","group":"foh","cat":"foh-3","name":"Kikkoman Soy Sauce (Dispenser Refill)","ar":"صويا صوص كيكومان لتعبئة الطاولات","stock":"6","unit":"bottle","stockQty":6,"stockUnit":"bottle","stockUpdatedAt":null,"packSize":"1 Litre"},{"id":"foh-015","group":"foh","cat":"foh-3","name":"Extra Virgin Olive Oil & Balsamic Refill","ar":"زيت زيتون بكر وخل بلسمك للطاولات","stock":"5","unit":"bottle","stockQty":5,"stockUnit":"bottle","stockUpdatedAt":null,"packSize":"750 ml"},{"id":"foh-016","group":"foh","cat":"foh-3","name":"Sea Salt & Black Peppercorns (Grinder Refill)","ar":"ملح بحري وفلفل أسود حب للمطاحن","stock":"4","unit":"kg","stockQty":4,"stockUnit":"kg","stockUpdatedAt":null,"packSize":"1 kg bag"},{"id":"foh-017","group":"foh","cat":"foh-4","name":"Table Sanitizer Spray (Food Safe)","ar":"بخاخ معقم طاولات آمن غذائيًا","stock":"9","unit":"bottle","stockQty":9,"stockUnit":"bottle","stockUpdatedAt":null,"packSize":"750 ml trigger"},{"id":"foh-018","group":"foh","cat":"foh-4","name":"Glass & Mirror Polish Spray","ar":"بخاخ تلميع الزجاج والمرايا","stock":"6","unit":"bottle","stockQty":6,"stockUnit":"bottle","stockUpdatedAt":null,"packSize":"750 ml"},{"id":"foh-019","group":"foh","cat":"foh-4","name":"Microfiber Polishing Cloths (Glass & Cutlery)","ar":"فوط مايكروفايبر لتنشيف الكؤوس والستيل","stock":"20","unit":"piece","stockQty":20,"stockUnit":"piece","stockUpdatedAt":null,"packSize":"Lint-free"},{"id":"bar-001","group":"bar","cat":"bar-0","name":"Tito's","ar":"","stock":"8","oldRequest":"4","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-002","group":"bar","cat":"bar-0","name":"Grapefruti Vodka","ar":"","stock":"4","oldRequest":"4","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-003","group":"bar","cat":"bar-0","name":"Russian Standard","ar":"","stock":"6","oldRequest":"4","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-004","group":"bar","cat":"bar-0","name":"Russian Platinum","ar":"","stock":"5","oldRequest":"2","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-005","group":"bar","cat":"bar-0","name":"Stolichnaya Red","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-006","group":"bar","cat":"bar-0","name":"Stolichnaya Gold","ar":"","stock":"4","oldRequest":"3","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-007","group":"bar","cat":"bar-0","name":"Haku Jap","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-008","group":"bar","cat":"bar-0","name":"Beluga Noble","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-009","group":"bar","cat":"bar-0","name":"Beluga Gold Line","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-010","group":"bar","cat":"bar-0","name":"Beluga Transatlantic","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-011","group":"bar","cat":"bar-0","name":"Beluga Alura","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-012","group":"bar","cat":"bar-0","name":"Imperial","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-013","group":"bar","cat":"bar-0","name":"Belvedere","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-014","group":"bar","cat":"bar-0","name":"Grey Goose","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-015","group":"bar","cat":"bar-0","name":"Ketel One","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-016","group":"bar","cat":"bar-0","name":"Deep Laddy","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-017","group":"bar","cat":"bar-0","name":"Chopin","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-018","group":"bar","cat":"bar-1","name":"Captain Morgan White","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-019","group":"bar","cat":"bar-1","name":"Captain Morgan Spice","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-020","group":"bar","cat":"bar-1","name":"Captain Morgan Black","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-021","group":"bar","cat":"bar-1","name":"Havana Club Gold","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-022","group":"bar","cat":"bar-1","name":"Bacardi Silver","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-023","group":"bar","cat":"bar-1","name":"Bacardi Gold","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-024","group":"bar","cat":"bar-1","name":"Diplomatico White","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-025","group":"bar","cat":"bar-1","name":"Diplomatico Reserva","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-026","group":"bar","cat":"bar-1","name":"Pyrat XO","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-027","group":"bar","cat":"bar-2","name":"Gordon's Dry","ar":"","stock":"8","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-028","group":"bar","cat":"bar-2","name":"Bombay Sapphire","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-029","group":"bar","cat":"bar-2","name":"Tanqueray","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-030","group":"bar","cat":"bar-2","name":"Tanqueray Ten","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-031","group":"bar","cat":"bar-2","name":"Hendrick's","ar":"","stock":"10","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-032","group":"bar","cat":"bar-2","name":"Beefeater","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-033","group":"bar","cat":"bar-2","name":"Monkey 47","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-034","group":"bar","cat":"bar-2","name":"Sipsmith","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-035","group":"bar","cat":"bar-2","name":"Bathtub","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-036","group":"bar","cat":"bar-2","name":"Gin Mari","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-037","group":"bar","cat":"bar-2","name":"Mistral Rose","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-038","group":"bar","cat":"bar-2","name":"Bulldog","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-039","group":"bar","cat":"bar-3","name":"Jose Cuervo Silver","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-040","group":"bar","cat":"bar-3","name":"Jose Cuervo Gold","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-041","group":"bar","cat":"bar-3","name":"1800 Blanco","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-042","group":"bar","cat":"bar-3","name":"1800 Reposado","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-043","group":"bar","cat":"bar-3","name":"1800 Anejo","ar":"","stock":"10/8","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-044","group":"bar","cat":"bar-3","name":"1800 Cristalino","ar":"","stock":"10/8","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-045","group":"bar","cat":"bar-3","name":"Patron Silver","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-046","group":"bar","cat":"bar-3","name":"Patron Anejo","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-047","group":"bar","cat":"bar-3","name":"Patron Reposado","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-048","group":"bar","cat":"bar-3","name":"Casamigos Blanco","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-049","group":"bar","cat":"bar-3","name":"Casamigos Reposado","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-050","group":"bar","cat":"bar-3","name":"Casamigos Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-051","group":"bar","cat":"bar-3","name":"Don Julio Silver","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-052","group":"bar","cat":"bar-3","name":"Don Julio Anejo","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-053","group":"bar","cat":"bar-3","name":"Don Julio Reposado","ar":"","stock":"12","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-054","group":"bar","cat":"bar-3","name":"Don Julio 1942","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-055","group":"bar","cat":"bar-3","name":"Clase Azul Plata","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-056","group":"bar","cat":"bar-3","name":"Clase Azul Reposado","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-057","group":"bar","cat":"bar-3","name":"Clase Azul Anejo","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-058","group":"bar","cat":"bar-3","name":"Clase Azul Gold","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-059","group":"bar","cat":"bar-3","name":"Olmeca Silver","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-060","group":"bar","cat":"bar-3","name":"Olmeca Gold","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-061","group":"bar","cat":"bar-3","name":"Ocho Plata","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-062","group":"bar","cat":"bar-3","name":"Ocho Reposado","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-063","group":"bar","cat":"bar-3","name":"Ocho Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-064","group":"bar","cat":"bar-3","name":"Lanazul Silver","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-065","group":"bar","cat":"bar-3","name":"Lanazul Reposado","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-066","group":"bar","cat":"bar-3","name":"Lanazul Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-067","group":"bar","cat":"bar-3","name":"Lanazul Primero","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-068","group":"bar","cat":"bar-3","name":"Komos Reposado","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-069","group":"bar","cat":"bar-3","name":"Komos Anejo","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-070","group":"bar","cat":"bar-3","name":"Teremana Blanco","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-071","group":"bar","cat":"bar-3","name":"Teremana Reposado","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-072","group":"bar","cat":"bar-3","name":"Teremana Anejo","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-073","group":"bar","cat":"bar-3","name":"Codigo 1530 Blanco","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-074","group":"bar","cat":"bar-3","name":"Hurradura Plata","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-075","group":"bar","cat":"bar-3","name":"Hurradura Reposado","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-076","group":"bar","cat":"bar-3","name":"Hurradura Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-077","group":"bar","cat":"bar-3","name":"Hurradura Ultra Anejo","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-078","group":"bar","cat":"bar-3","name":"Hurradura Legand","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-079","group":"bar","cat":"bar-3","name":"Hurradura Suprema","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-080","group":"bar","cat":"bar-3","name":"Los Danzantes Mezcal","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-081","group":"bar","cat":"bar-3","name":"Se Busca Mezcal","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-082","group":"bar","cat":"bar-4","name":"Wild Turkey","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-083","group":"bar","cat":"bar-4","name":"Wood Ford","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-084","group":"bar","cat":"bar-4","name":"Jack Daniel's","ar":"","stock":"5","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-085","group":"bar","cat":"bar-4","name":"J&B Rare","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-086","group":"bar","cat":"bar-4","name":"Chivas Regal 12","ar":"","stock":"8","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-087","group":"bar","cat":"bar-4","name":"Chivas Regal 18","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-088","group":"bar","cat":"bar-4","name":"Chivas XV","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-089","group":"bar","cat":"bar-4","name":"JW Red Label","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-090","group":"bar","cat":"bar-4","name":"JW Black Label","ar":"","stock":"10","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-091","group":"bar","cat":"bar-4","name":"JW Doubel Black","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-092","group":"bar","cat":"bar-4","name":"JW Gold Label","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-093","group":"bar","cat":"bar-4","name":"JW Blue Label","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-094","group":"bar","cat":"bar-4","name":"JW Platinum 18","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-095","group":"bar","cat":"bar-4","name":"Monkey Shoulder","ar":"","stock":"4","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-096","group":"bar","cat":"bar-4","name":"Royal Salute","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-097","group":"bar","cat":"bar-4","name":"Glenfiddich 12","ar":"","stock":"5","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-098","group":"bar","cat":"bar-4","name":"Glenfiddich 15","ar":"","stock":"5","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-099","group":"bar","cat":"bar-4","name":"Glenfiddich 18","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-100","group":"bar","cat":"bar-4","name":"Glenfiddich 21","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-101","group":"bar","cat":"bar-4","name":"Macallan 12","ar":"","stock":"6","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-102","group":"bar","cat":"bar-4","name":"Macallan 18","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-103","group":"bar","cat":"bar-4","name":"Glenmorange 12","ar":"","stock":"5","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-104","group":"bar","cat":"bar-4","name":"Wormtub 10","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-105","group":"bar","cat":"bar-4","name":"Laphroaig 10","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-106","group":"bar","cat":"bar-4","name":"Glenfarclas 10","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-107","group":"bar","cat":"bar-4","name":"Glenfarclas12","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-108","group":"bar","cat":"bar-4","name":"Glenfarclas 15","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-109","group":"bar","cat":"bar-4","name":"Auchentoshan singel malt","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-110","group":"bar","cat":"bar-4","name":"JW Swing","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-111","group":"bar","cat":"bar-5","name":"Hennessy V.S","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-112","group":"bar","cat":"bar-5","name":"Hennessy X.O","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-113","group":"bar","cat":"bar-5","name":"Hennessy V.S.O.P","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-114","group":"bar","cat":"bar-5","name":"Camus V.S","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-115","group":"bar","cat":"bar-5","name":"Camus V.S.O.P","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-116","group":"bar","cat":"bar-5","name":"Camus X.O","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-117","group":"bar","cat":"bar-5","name":"Remy Martin V.S.O.P","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-118","group":"bar","cat":"bar-6","name":"PETRA Gluten Free","ar":"","stock":"48","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-119","group":"bar","cat":"bar-6","name":"ASAHI","ar":"","stock":"120","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-120","group":"bar","cat":"bar-6","name":"CARAKALE Blue Valley","ar":"","stock":"48","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-121","group":"bar","cat":"bar-6","name":"ESTRELLA","ar":"","stock":"40","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-122","group":"bar","cat":"bar-7","name":"Aperol","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-123","group":"bar","cat":"bar-7","name":"Campari","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-124","group":"bar","cat":"bar-7","name":"Grand Marnier","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-125","group":"bar","cat":"bar-7","name":"Baileys Irish Cream","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-126","group":"bar","cat":"bar-7","name":"Kahlua \"coffee Liqueur","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-127","group":"bar","cat":"bar-7","name":"Frangelico","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-128","group":"bar","cat":"bar-7","name":"Sour Apple","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-129","group":"bar","cat":"bar-7","name":"Melon","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-130","group":"bar","cat":"bar-7","name":"Passoa \"Passiona Fruit Liqueur\"","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-131","group":"bar","cat":"bar-7","name":"Southern Compfort","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":3,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-132","group":"bar","cat":"bar-7","name":"Disaronno","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-133","group":"bar","cat":"bar-7","name":"Amaretto","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-134","group":"bar","cat":"bar-7","name":"Lemoncino","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-135","group":"bar","cat":"bar-7","name":"Jagermeister","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-136","group":"bar","cat":"bar-7","name":"Malibu","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-137","group":"bar","cat":"bar-7","name":"Peach Schnapps","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-138","group":"bar","cat":"bar-7","name":"Vermouth Extra Dry","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-139","group":"bar","cat":"bar-7","name":"Vermouth Bianco","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-140","group":"bar","cat":"bar-7","name":"Vermouth Rosso","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-141","group":"bar","cat":"bar-7","name":"Dolin White Vermouth","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-142","group":"bar","cat":"bar-7","name":"Skinos","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-143","group":"bar","cat":"bar-7","name":"Sambuca White","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-144","group":"bar","cat":"bar-7","name":"Sambuca Black","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-145","group":"bar","cat":"bar-7","name":"Farnet Branca","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-146","group":"bar","cat":"bar-7","name":"Gold Schlager","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-147","group":"bar","cat":"bar-7","name":"Fire Ball","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-148","group":"bar","cat":"bar-7","name":"Trpile Sec","ar":"","stock":"8","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-149","group":"bar","cat":"bar-7","name":"Blue Curacao","ar":"","stock":"3","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-150","group":"bar","cat":"bar-7","name":"Galliano","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-151","group":"bar","cat":"bar-7","name":"Cointreau","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-152","group":"bar","cat":"bar-7","name":"Grappa","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-153","group":"bar","cat":"bar-7","name":"Elderflower Liqueur","ar":"","stock":"2","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-154","group":"bar","cat":"bar-7","name":"PER SE","ar":"","stock":"1","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-155","group":"bar","cat":"bar-7","name":"Apricot Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-156","group":"bar","cat":"bar-7","name":"Amaro Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-157","group":"bar","cat":"bar-7","name":"Cocchi Americano","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-158","group":"bar","cat":"bar-7","name":"Cherry Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-159","group":"bar","cat":"bar-7","name":"Cocchi Rosa","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-160","group":"bar","cat":"bar-7","name":"Maraschino Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-161","group":"bar","cat":"bar-7","name":"Lychee Liqueur","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-162","group":"bar","cat":"bar-7","name":"Lillet Blanc","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-163","group":"bar","cat":"bar-7","name":"Suze","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-164","group":"bar","cat":"bar-7","name":"Crème De Cacao","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-165","group":"bar","cat":"bar-7","name":"Bols flv","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":true,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-166","group":"bar","cat":"bar-7","name":"Bols flv","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":true,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-167","group":"bar","cat":"bar-7","name":"Bols flv","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":true,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-168","group":"bar","cat":"bar-7","name":"Bols flv","ar":"","stock":"","oldRequest":"","unit":"bottle","page":4,"ambiguous":true,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-169","group":"bar","cat":"bar-8","name":"Passion fruit Puree","ar":"","stock":"6","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-170","group":"bar","cat":"bar-8","name":"Strawberry Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-171","group":"bar","cat":"bar-8","name":"Raspberry Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-172","group":"bar","cat":"bar-8","name":"Kiwi Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-173","group":"bar","cat":"bar-8","name":"Watermelon Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-174","group":"bar","cat":"bar-8","name":"Pineappel Puree","ar":"","stock":"2","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-175","group":"bar","cat":"bar-8","name":"Blueberry Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-176","group":"bar","cat":"bar-8","name":"Blackberry Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-177","group":"bar","cat":"bar-8","name":"Mango Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-178","group":"bar","cat":"bar-8","name":"Agave Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-179","group":"bar","cat":"bar-8","name":"Coconut Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-180","group":"bar","cat":"bar-8","name":"Peach Puree","ar":"","stock":"3","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-181","group":"bar","cat":"bar-8","name":"Vanilla Puree","ar":"","stock":"2","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-182","group":"bar","cat":"bar-8","name":"Melon Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-183","group":"bar","cat":"bar-8","name":"Lychee Puree","ar":"","stock":"2","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-184","group":"bar","cat":"bar-8","name":"Banana Puree","ar":"","stock":"","oldRequest":"","unit":"","page":4,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-185","group":"bar","cat":"bar-8","name":"Appel Juice","ar":"","stock":"5/2","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-186","group":"bar","cat":"bar-8","name":"Pineappel Juice","ar":"","stock":"6","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-187","group":"bar","cat":"bar-8","name":"Orange Juice","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-188","group":"bar","cat":"bar-8","name":"Cranberry Juice","ar":"","stock":"8","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-189","group":"bar","cat":"bar-8","name":"Tomato Juice","ar":"","stock":"5","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-190","group":"bar","cat":"bar-8","name":"Green Apple Juice","ar":"","stock":"2","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-191","group":"bar","cat":"bar-9","name":"Pepsi","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-192","group":"bar","cat":"bar-9","name":"Pepsi Diet","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-193","group":"bar","cat":"bar-9","name":"7up","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-194","group":"bar","cat":"bar-9","name":"7up Diet","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-195","group":"bar","cat":"bar-9","name":"Soda Water","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-196","group":"bar","cat":"bar-9","name":"Tonic","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-197","group":"bar","cat":"bar-9","name":"Bitter Lemon","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-198","group":"bar","cat":"bar-9","name":"Pink Lemonade","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-199","group":"bar","cat":"bar-9","name":"G Cranberry","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-200","group":"bar","cat":"bar-9","name":"G Cola Night","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-201","group":"bar","cat":"bar-9","name":"G Cola Night S.F","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-202","group":"bar","cat":"bar-9","name":"Ginger Ale","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-203","group":"bar","cat":"bar-9","name":"Thomas Henry Soda","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-204","group":"bar","cat":"bar-9","name":"Thomas Henry Tonic","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-205","group":"bar","cat":"bar-9","name":"Thomas Henry Ginger Beer","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-206","group":"bar","cat":"bar-9","name":"Thomas Henry Pink Greapfruti","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-207","group":"bar","cat":"bar-9","name":"Red Bull","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-208","group":"bar","cat":"bar-9","name":"Red Bull \"Sugar Free\"","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-209","group":"bar","cat":"bar-9","name":"Coconut Water","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-210","group":"bar","cat":"bar-10","name":"Water Small","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-211","group":"bar","cat":"bar-10","name":"Water Large","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-212","group":"bar","cat":"bar-10","name":"S.Pellegrino Small","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-213","group":"bar","cat":"bar-10","name":"S.Pellegrino Large","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-214","group":"bar","cat":"bar-11","name":"Angostura Bitters","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-215","group":"bar","cat":"bar-11","name":"Orange Bitters","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-216","group":"bar","cat":"bar-11","name":"Chocolate Bitters","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-217","group":"bar","cat":"bar-11","name":"Grapefruit Bitters","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-218","group":"bar","cat":"bar-12","name":"Tabasco Sauce","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-219","group":"bar","cat":"bar-12","name":"Worcestershire Sauce","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-220","group":"bar","cat":"bar-12","name":"Olive","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-221","group":"bar","cat":"bar-12","name":"Marchiano cherry","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-222","group":"bar","cat":"bar-12","name":"Aquafaba","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-223","group":"bar","cat":"bar-12","name":"Coconut Milk","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-224","group":"bar","cat":"bar-12","name":"Milk","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-225","group":"bar","cat":"bar-12","name":"Espresso","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-226","group":"bar","cat":"bar-12","name":"Tea","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-227","group":"bar","cat":"bar-12","name":"Brown Sugar","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-228","group":"bar","cat":"bar-12","name":"White Sugar","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-229","group":"bar","cat":"bar-12","name":"Tajin Spice","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-230","group":"bar","cat":"bar-12","name":"Sea Salt","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-231","group":"bar","cat":"bar-12","name":"Salt","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-232","group":"bar","cat":"bar-12","name":"Black Pepper","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-233","group":"bar","cat":"bar-12","name":"Monky Fruti","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-234","group":"bar","cat":"bar-12","name":"Rose Water","ar":"","stock":"","oldRequest":"","unit":"","page":5,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-235","group":"bar","cat":"bar-12","name":"iSi CO2 Soda","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-236","group":"bar","cat":"bar-12","name":"iSi Nitro","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-237","group":"bar","cat":"bar-12","name":"Sticks","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-238","group":"bar","cat":"bar-12","name":"Toothpicks","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-239","group":"bar","cat":"bar-12","name":"Napkin","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-240","group":"bar","cat":"bar-12","name":"Straws","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"bar-241","group":"bar","cat":"bar-12","name":"To Go Cups (Disposable Cup)","ar":"","stock":"","oldRequest":"","unit":"","page":6,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-001","group":"wine","cat":"wine-0","name":"Marius by M. Chapoutier","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-002","group":"wine","cat":"wine-0","name":"Sirius","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-003","group":"wine","cat":"wine-0","name":"Chateau Haut Madrac","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-004","group":"wine","cat":"wine-0","name":"Chateau Margaux","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-005","group":"wine","cat":"wine-0","name":"Domaine Faiveley","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-006","group":"wine","cat":"wine-0","name":"Louis Eschenauer","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-007","group":"wine","cat":"wine-0","name":"Chapelle De La Trinite","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-008","group":"wine","cat":"wine-0","name":"Lions De Batailley","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-009","group":"wine","cat":"wine-0","name":"Secret De Famille","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-010","group":"wine","cat":"wine-0","name":"M.Chapoutier","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-011","group":"wine","cat":"wine-1","name":"Piccini","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-012","group":"wine","cat":"wine-1","name":"Frescobaldi Nipozzano","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-013","group":"wine","cat":"wine-1","name":"Mai","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-014","group":"wine","cat":"wine-1","name":"Antinori","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-015","group":"wine","cat":"wine-1","name":"GAJA","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-016","group":"wine","cat":"wine-1","name":"Banfi","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-017","group":"wine","cat":"wine-1","name":"CA'MAIOL","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-018","group":"wine","cat":"wine-1","name":"Villa Antinori","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-019","group":"wine","cat":"wine-1","name":"Fontanafredda","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-020","group":"wine","cat":"wine-1","name":"Bortolomilo","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-021","group":"wine","cat":"wine-1","name":"Stelle & Fortuna","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-022","group":"wine","cat":"wine-1","name":"Ornellaia","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-023","group":"wine","cat":"wine-1","name":"Fontanafredda (Barolo DOCG)","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-024","group":"wine","cat":"wine-2","name":"CVNE","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-025","group":"wine","cat":"wine-2","name":"Beronia Rioja Crianza","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-026","group":"wine","cat":"wine-2","name":"Marques De Riscal (Tinto XR)","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-027","group":"wine","cat":"wine-2","name":"Marques De Riscal (Reserve)","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-028","group":"wine","cat":"wine-3","name":"JR Reserve","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-029","group":"wine","cat":"wine-3","name":"Montes","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-030","group":"wine","cat":"wine-3","name":"Susana Balbo","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-031","group":"wine","cat":"wine-3","name":"Oyster Bay","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-032","group":"wine","cat":"wine-3","name":"LA Celia","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-033","group":"wine","cat":"wine-3","name":"Santa Digna","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-034","group":"wine","cat":"wine-3","name":"KWV","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-035","group":"wine","cat":"wine-4","name":"Louis Eschenauer","ar":"","stock":"","oldRequest":"","unit":"bottle","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-036","group":"wine","cat":"wine-4","name":"Domaine Albert Bichot","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-037","group":"wine","cat":"wine-4","name":"William Fevre","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-038","group":"wine","cat":"wine-4","name":"Barton & Guestier","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-039","group":"wine","cat":"wine-4","name":"De Ladoucette","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-040","group":"wine","cat":"wine-4","name":"Grand Regnard","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-041","group":"wine","cat":"wine-5","name":"Bottega","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-042","group":"wine","cat":"wine-5","name":"Fontanafredda (Gavi)","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-043","group":"wine","cat":"wine-5","name":"Banfi","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-044","group":"wine","cat":"wine-5","name":"CA'MAIOL","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-045","group":"wine","cat":"wine-5","name":"Danzante","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-046","group":"wine","cat":"wine-5","name":"LA Scolca","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-047","group":"wine","cat":"wine-5","name":"Frescobaldi","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-048","group":"wine","cat":"wine-6","name":"CVNE","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-049","group":"wine","cat":"wine-6","name":"Beronia","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-050","group":"wine","cat":"wine-7","name":"JR Reserve","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-051","group":"wine","cat":"wine-7","name":"Oyster Bay","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-052","group":"wine","cat":"wine-7","name":"KWV","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-053","group":"wine","cat":"wine-7","name":"Kia Ora","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-054","group":"wine","cat":"wine-7","name":"LA Scolca","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-055","group":"wine","cat":"wine-7","name":"Frescobaldi","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-056","group":"wine","cat":"wine-8","name":"JR Rose","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-057","group":"wine","cat":"wine-8","name":"Whispering Angel","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-058","group":"wine","cat":"wine-8","name":"Piccini","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-059","group":"wine","cat":"wine-8","name":"Susana Balbo","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-060","group":"wine","cat":"wine-9","name":"Bottega Brut","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-061","group":"wine","cat":"wine-9","name":"Bottega Rose","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-062","group":"wine","cat":"wine-9","name":"Prince Laurent","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-063","group":"wine","cat":"wine-9","name":"Most & Chandon Brut","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-064","group":"wine","cat":"wine-9","name":"Most & Chandon Rose","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-065","group":"wine","cat":"wine-9","name":"Louis Roederer","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"wine-066","group":"wine","cat":"wine-9","name":"Dom Perignon","ar":"","stock":"","oldRequest":"","unit":"bottle","page":2,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-001","group":"fresh","cat":"fresh-fruit","name":"Lemon","ar":"ليمون","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-002","group":"fresh","cat":"fresh-fruit","name":"Lime","ar":"لايم","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-003","group":"fresh","cat":"fresh-fruit","name":"Orange","ar":"برتقال","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-004","group":"fresh","cat":"fresh-fruit","name":"Graepfruti","ar":"جريب فروت","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-005","group":"fresh","cat":"fresh-fruit","name":"Cucmber","ar":"خيار","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-006","group":"fresh","cat":"fresh-fruit","name":"Ginger","ar":"زنجبيل","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-007","group":"fresh","cat":"fresh-fruit","name":"Pineapple","ar":"أناناس","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-008","group":"fresh","cat":"fresh-fruit","name":"Kiwi","ar":"كيوي","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-009","group":"fresh","cat":"fresh-fruit","name":"Passion Fruti","ar":"باشن فروت","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-010","group":"fresh","cat":"fresh-fruit","name":"Apple","ar":"تفاح","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-011","group":"fresh","cat":"fresh-fruit","name":"Strawberry","ar":"فراولة","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-012","group":"fresh","cat":"fresh-fruit","name":"Blackberry","ar":"توت أسود","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-013","group":"fresh","cat":"fresh-fruit","name":"Raspberry","ar":"توت أحمر","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-014","group":"fresh","cat":"fresh-fruit","name":"Cherry Tomato","ar":"بندورة كرزية","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-015","group":"fresh","cat":"fresh-fruit","name":"Tomato","ar":"بندورة","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-016","group":"fresh","cat":"fresh-fruit","name":"Red Chilies","ar":"فلفل أحمر حار","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-017","group":"fresh","cat":"fresh-fruit","name":"Green Chilies","ar":"فلفل أخضر حار","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-018","group":"fresh","cat":"fresh-herb","name":"Edible Flowers","ar":"زهور صالحة للأكل","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-019","group":"fresh","cat":"fresh-herb","name":"Thyme","ar":"زعتر","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-020","group":"fresh","cat":"fresh-herb","name":"Mint","ar":"نعنع","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-021","group":"fresh","cat":"fresh-herb","name":"Basil","ar":"ريحان","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-022","group":"fresh","cat":"fresh-herb","name":"Rosemary","ar":"إكليل الجبل","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-023","group":"fresh","cat":"fresh-herb","name":"Shiso Leaves","ar":"أوراق شيزو","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""},{"id":"fresh-024","group":"fresh","cat":"fresh-fruit","name":"Shishito Peppers","ar":"فلفل شيشيتو","stock":"","oldRequest":"","unit":"","page":1,"ambiguous":false,"stockQty":null,"stockUnit":"","stockUpdatedAt":null,"packSize":""}]};

  let ordRoute = 'home'; // 'home' | 'types/<group>' | 'products/<cat>' | 'item/<id>' | 'complete/<cat>' | 'review'
  let ordForceAllGroups = false;
  let ordProductSearch = '';
  let ordQuickSearch = '';
  let ordQuickOnlyRequested = false;
  let ordReturnToReview = false;
  let ordIncludeStockInMsg = false;

  function emptyOrderState() {
    const session = getSession();
    return {
      orderToken: 'ord-' + Date.now().toString(36),
      meta: {
        requester: (session && session.displayName) || S.me.name || '',
        orderDate: S.date || FOH.time.todayISO(),
        shift: 'Morning',
        destination: 'Store',
        priority: 'Normal',
        orderNote: '',
      },
      lines: {},
      visited: {},
      skipped: {},
      lastItem: null,
    };
  }

  function loadOrdersDB() {
    try {
      const raw = FOH.safeJsonParse(localStorage.getItem(ORDERS_DB_KEY), 'null');
      if (raw && raw.version === 2 && raw.catalog && raw.order) {
        // Ensure any new seed groups/categories/items exist
        Object.entries(ORD_SEED.groups).forEach(([gid, g]) => {
          if (!raw.catalog.groups[gid]) raw.catalog.groups[gid] = JSON.parse(JSON.stringify(g));
        });
        const catIds = new Set(raw.catalog.categories.map((c) => c.id));
        ORD_SEED.categories.forEach((c) => {
          if (!catIds.has(c.id)) raw.catalog.categories.unshift(JSON.parse(JSON.stringify(c)));
        });
        const itemIds = new Set(raw.catalog.items.map((i) => i.id));
        ORD_SEED.items.forEach((i) => {
          if (!itemIds.has(i.id)) raw.catalog.items.push(JSON.parse(JSON.stringify(i)));
        });
        raw.preferences = raw.preferences || { viewMode: 'step' };
        raw.order.visited = raw.order.visited || {};
        raw.order.skipped = raw.order.skipped || {};
        raw.order.lines = raw.order.lines || {};
        return raw;
      }
    } catch {}
    return {
      version: 2,
      catalog: JSON.parse(JSON.stringify(ORD_SEED)),
      order: emptyOrderState(),
      preferences: { viewMode: 'step' },
    };
  }

  let ordDB = loadOrdersDB();

  function saveOrdersDB() {
    try {
      localStorage.setItem(ORDERS_DB_KEY, JSON.stringify(ordDB));
    } catch {}
    updateOrderBadge();
  }

  function ordById(id) {
    return ordDB.catalog.items.find((i) => i.id === id);
  }
  function ordCat(cid) {
    return ordDB.catalog.categories.find((c) => c.id === cid);
  }
  function ordCatItems(cid) {
    return ordDB.catalog.items.filter((i) => i.cat === cid && !i.deletedAt);
  }
  function ordLine(id) {
    const it = ordById(id);
    return ordDB.order.lines[id] || { qty: 0, unit: (it && it.unit) || 'bottle', note: '', stock: '' };
  }
  function ordSelectedItems() {
    return ordDB.catalog.items.filter((i) => !i.deletedAt && ordLine(i.id).qty > 0);
  }
  function ordCatDone(cid) {
    return ordCatItems(cid).filter((i) => ordDB.order.visited[i.id]).length;
  }
  function ordCatSkipped(cid) {
    return ordCatItems(cid).filter((i) => ordDB.order.skipped[i.id]).length;
  }
  function ordPendingItem(cid) {
    return ordCatItems(cid).find((i) => !ordDB.order.visited[i.id] && !ordDB.order.skipped[i.id]);
  }
  function ordUnitText(n, u) {
    if (!u) return FOH.i18n.lang === 'ar' ? 'اختر الوحدة' : 'unit not set';
    return n === 1 ? (ORD_UNITS[u] || u).toLowerCase() : ORD_PLURALS[u] || u + 's';
  }
  function ordStockDenominator(i) {
    if (i.stockQty !== null && i.stockQty !== undefined) return String(i.stockQty);
    return /^\d+(\.\d+)?$/.test(i.stock || '') ? i.stock + '*' : '—';
  }
  function ordStockLabel(i) {
    if (i.stockQty !== null && i.stockQty !== undefined) {
      return i.stockQty + ' ' + ordUnitText(i.stockQty, i.stockUnit || i.unit);
    }
    return i.stock || (FOH.i18n.lang === 'ar' ? 'غير مسجّل' : 'Not recorded');
  }
  function ordStockRatioHint(i, u) {
    const ar = FOH.i18n.lang === 'ar';
    if (i.stockQty === null || i.stockQty === undefined) {
      if (/^\d+(\.\d+)?$/.test(i.stock || '')) {
        return ar ? '* مخزون مرجعي من ملف البار · الوحدة غير مؤكدة.' : '* File stock reference; unit/date unconfirmed.';
      }
      return i.stock
        ? (ar ? 'قيمة مخزون غير واضحة (' + i.stock + ') · يرجى التأكد.' : 'Unclear file value: ' + i.stock + '. Verify stock.')
        : (ar ? 'المخزون غير مسجّل بعد.' : 'Stock has not been recorded.');
    }
    return ar
      ? 'الكمية المطلوبة / المخزون المسجّل · لا يتم خصم المخزون تلقائيًا.'
      : 'Order / stock · ' + ordUnitText(2, u || i.unit) + '. Preparing an order does not deduct stock.';
  }
  function ordSkipRemaining(cid, afterId = null) {
    const list = ordCatItems(cid);
    const start = afterId ? list.findIndex((i) => i.id === afterId) + 1 : 0;
    list.slice(start).forEach((i) => {
      if (!ordDB.order.visited[i.id] && ordLine(i.id).qty === 0) {
        ordDB.order.skipped[i.id] = true;
      }
    });
  }

  function allowedGroupsForCurrentRole() {
    const entries = Object.entries(ordDB.catalog.groups);
    if (ordForceAllGroups || !session || session.isManager) return entries;
    const roleLower = String(session.roleName || '').toLowerCase();
    const matched = entries.filter(([, g]) => Array.isArray(g.roles) && g.roles.includes(roleLower));
    return matched.length ? matched : entries;
  }

  function markWarehouseChecklistItemDone() {
    let targetId = null;
    S.tpl.sections.forEach((sec) => {
      sec.items.forEach((it) => {
        if (/warehouse|المستودع/i.test(it.text + ' ' + (it.textAr || ''))) targetId = it.id;
      });
    });
    if (targetId && !S.run.checked[targetId]) {
      S.run.checked[targetId] = FOH.time.nowHM();
      FOH.store.saveRun(S.date, S.run);
      apiCall('POST', '/v1/foh-opening/runs/tick', {
        business_date: S.date,
        sheet_type: 'opening',
        item_ids: [targetId],
        checked: true,
        at_hm: FOH.time.nowHM(),
        by_name: (session && session.displayName) || S.me.name || 'Staff',
      });
      FOH.edit.toast(t('ordAutoTickNote'));
    }
  }

  function updateOrderBadge() {
    const count = ordSelectedItems().length;
    const badge = $('badgeOrders');
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }
    const lbl = $('ordersTabLbl');
    if (lbl) lbl.textContent = t('ordersTab');
  }

  function ordGo(nextRoute) {
    ordRoute = nextRoute || 'home';
    const root = $('ordersView');
    if (root) {
      renderOrdersView(root);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function promptEditStock(item) {
    const ar = FOH.i18n.lang === 'ar';
    const rawQty = prompt(
      ar
        ? `تحديث المخزون الفعلي للصنف "${item.name}":\n(القيمة الحالية: ${ordStockLabel(item)})`
        : `Update recorded stock count for "${item.name}":\n(Current: ${ordStockLabel(item)})`,
      item.stockQty !== null && item.stockQty !== undefined ? String(item.stockQty) : item.stock || '0'
    );
    if (rawQty === null) return;
    const qty = Number(rawQty.trim());
    if (!Number.isFinite(qty) || qty < 0 || qty > 99999) {
      return alert(ar ? 'يرجى إدخال رقم صحيح للمخزون.' : 'Please enter a valid stock number.');
    }
    item.stockQty = Math.round(qty * 100) / 100;
    item.stockUnit = item.stockUnit || item.unit || 'bottle';
    item.stockUpdatedAt = new Date().toISOString();
    saveOrdersDB();
    renderOrdersView($('ordersView'));
  }

  function buildOrdBreadcrumbs(groupKey, catId, tailLabel) {
    const ar = FOH.i18n.lang === 'ar';
    const nav = el('nav', 'ord-crumbs');
    const homeBtn = el('button', '', ar ? 'الأقسام (Sections)' : 'Sections');
    homeBtn.type = 'button';
    homeBtn.addEventListener('click', () => ordGo('home'));
    nav.append(homeBtn);

    if (groupKey && ordDB.catalog.groups[groupKey]) {
      nav.append(el('span', '', '›'));
      const g = ordDB.catalog.groups[groupKey];
      const gBtn = el('button', '', ar ? g.nameAr || g.name : g.name);
      gBtn.type = 'button';
      gBtn.addEventListener('click', () => ordGo('types/' + groupKey));
      nav.append(gBtn);
    }
    if (catId && ordCat(catId)) {
      nav.append(el('span', '', '›'));
      const c = ordCat(catId);
      const cBtn = el('button', '', ar ? c.nameAr || c.name : c.name);
      cBtn.type = 'button';
      cBtn.addEventListener('click', () => ordGo('products/' + catId));
      nav.append(cBtn);
    }
    if (tailLabel) {
      nav.append(el('span', '', '›'), el('span', '', tailLabel));
    }
    return nav;
  }

  function buildOrdViewSwitch(catId, activeMode) {
    const sw = el('div', 'ord-view-switch');
    const stepBtn = el(
      'button',
      activeMode === 'step' ? 'on' : '',
      FOH.i18n.lang === 'ar' ? '▣ صنفًا بصنف (Step-by-step)' : '▣ Step-by-step'
    );
    stepBtn.type = 'button';
    stepBtn.addEventListener('click', () => {
      ordDB.preferences.viewMode = 'step';
      saveOrdersDB();
      const pending = ordPendingItem(catId) || ordCatItems(catId)[0];
      ordGo(pending ? 'item/' + pending.id : 'products/' + catId);
    });

    const listBtn = el(
      'button',
      activeMode === 'list' ? 'on' : '',
      FOH.i18n.lang === 'ar' ? '☷ القائمة السريعة (Quick list)' : '☷ Quick list'
    );
    listBtn.type = 'button';
    listBtn.addEventListener('click', () => {
      ordDB.preferences.viewMode = 'list';
      saveOrdersDB();
      ordGo('products/' + catId);
    });

    sw.append(stepBtn, listBtn);
    return sw;
  }

  function promptStartNewOrder(onComplete) {
    const ar = isAr();
    const currentCount = ordSelectedItems().length;

    const doReset = () => {
      const priorMeta = ordDB.order && ordDB.order.meta ? { ...ordDB.order.meta } : null;
      if (currentCount > 0) {
        ordDB.orderHistory = ordDB.orderHistory || [];
        ordDB.orderHistory.unshift({
          token: (ordDB.order && ordDB.order.orderToken) || ('ord-' + Date.now().toString(36)),
          date: (priorMeta && priorMeta.orderDate) || FOH.time.todayISO(),
          itemsCount: currentCount,
          lines: JSON.parse(JSON.stringify((ordDB.order && ordDB.order.lines) || {})),
          meta: priorMeta,
          archivedAt: new Date().toISOString(),
        });
        if (ordDB.orderHistory.length > 20) ordDB.orderHistory.length = 20;
      }

      ordDB.order = emptyOrderState();
      saveOrdersDB();
      if (FOH.edit && FOH.edit.toast) {
        FOH.edit.toast(ar ? '✨ تم تصفير الطلبية وبدء طلبية جديدة بنجاح' : '✨ New order started. Quantities reset.');
      }
      if (typeof onComplete === 'function') {
        onComplete();
      } else {
        const root = $('ordersView') || $('tab-orders') || document.querySelector('.orders-view-root');
        if (root) renderOrdersView(root);
      }
    };

    if (currentCount > 0) {
      const confirmed = window.confirm(
        ar
          ? `✨ بدء طلبية جديدة (New Order)\n\nهل أنت متأكد من تصفير كميات الطلبية الحالية (${currentCount} صنف مطلوب) للبدء بطلبية جديدة فارغة؟\n(الكتالوج والمخزون سيبقيان كما هما دون تغيير).`
          : `✨ Start New Order\n\nReset current order (${currentCount} requested items) to 0 and start a fresh order?\n(Catalog and stock will remain unchanged).`
      );
      if (confirmed) {
        doReset();
      }
    } else {
      doReset();
    }
  }

  function buildOrdWhatsAppText(includeStock) {
    const session = getSession();
    const m = ordDB.order.meta;
    const requester = (session && session.displayName) || S.me.name || m.requester || 'Staff';
    const orderDate = S.date || FOH.time.todayISO();
    const list = ordSelectedItems();
    const lines = [
      '*CEEN & OASIS | WAREHOUSE & BAR ORDER*',
      '',
      `Date: ${orderDate}`,
      `Prepared by: ${requester}`,
      `Destination: Store Warehouse`,
      `Requested items: ${list.length}`,
    ];

    let lastCat = '';
    let idx = 0;
    list.forEach((i) => {
      const l = ordLine(i.id);
      if (lastCat !== i.cat) {
        const gName = (ordDB.catalog.groups[i.group] && ordDB.catalog.groups[i.group].name) || i.group;
        const cName = (ordCat(i.cat) && ordCat(i.cat).name) || i.cat;
        lines.push(`\n*${(gName + ' / ' + cName).toUpperCase()}*`);
        lastCat = i.cat;
      }
      lines.push(`${++idx}. ${i.name}${i.ar ? ' (' + i.ar + ')' : ''} — *${l.qty} ${ordUnitText(l.qty, l.unit || i.unit)}*`);
      if (i.packSize) lines.push(`   Size / pack: ${i.packSize}`);
      if (l.note) lines.push(`   Note: ${l.note}`);
      if (includeStock) {
        lines.push(`   Stock: ${ordStockLabel(i)}`);
      }
    });

    if (m.orderNote) {
      lines.push('\n*ORDER NOTE*\n' + m.orderNote);
    }
    lines.push('\nPlease confirm availability and any shortages.');
    return lines.join('\n');
  }

  function renderOrdersView(root) {
    if (!root) return;
    if (!canCurrentUserAccessOrders()) {
      root.replaceChildren();
      const ar = isAr();
      const blockCard = el('div', 'ord-block-card');
      blockCard.style.padding = '32px 16px';
      blockCard.style.textAlign = 'center';
      blockCard.style.background = 'var(--surface)';
      blockCard.style.borderRadius = '16px';
      blockCard.style.margin = '20px 0';
      blockCard.innerHTML =
        '<div style="font-size:2.5rem;margin-bottom:12px;">🔒</div>' +
        '<h3 style="margin:0 0 8px;">' + (ar ? 'قسم الطلبيات مخصص ومحمي' : 'Ordering Access Restricted') + '</h3>' +
        '<p style="color:var(--muted);margin:0;font-size:0.9rem;line-height:1.5;">' +
        (ar
          ? 'تم تفويض صلاحية طلبيات البار والمستودع لموظفين وبوزيشنات محددة من قبل الإدارة.<br>يمكن للمدير تعديل الصلاحيات والتفويض من قسم الإعدادات.'
          : 'Ordering has been delegated to specific roles or staff by management.<br>Permissions can be updated in Settings.') +
        '</p>';
      root.append(blockCard);
      return;
    }
    root.replaceChildren();
    updateOrderBadge();

    const session = getSession();
    const ar = FOH.i18n.lang === 'ar';
    const selectedList = ordSelectedItems();

    // Top Hero Header with Role Badge, Show All Toggle, and Basket Button
    const hero = el('div', 'ord-hero');
    const roleTitle = ar ? (session && session.roleAr) || 'مشرف' : (session && session.roleName) || 'Supervisor';
    const leftHead = el('div', '');
    leftHead.style.display = 'flex';
    leftHead.style.alignItems = 'center';
    leftHead.style.gap = '8px';
    leftHead.style.flexWrap = 'wrap';
    leftHead.append(
      el('b', '', '🛒 ' + t('ordTitle')),
      el('span', 'ord-role-badge', '🪪 ' + t('ordRoleFilter', { role: roleTitle }))
    );
    hero.append(leftHead);

    const actions = el('div', 'ord-top-actions');
    if (session && !session.isManager) {
      const toggleAll = el('button', 'btn', ordForceAllGroups ? '🔒 ' + roleTitle : '🔓 ' + t('ordShowAll'));
      toggleAll.type = 'button';
      toggleAll.style.minHeight = '34px';
      toggleAll.style.padding = '0 10px';
      toggleAll.style.fontSize = '0.75rem';
      toggleAll.addEventListener('click', () => {
        ordForceAllGroups = !ordForceAllGroups;
        ordGo('home');
      });
      actions.append(toggleAll);
    }

    const newOrderHeroBtn = el('button', 'ord-new-order-hero-btn');
    newOrderHeroBtn.type = 'button';
    newOrderHeroBtn.title = ar ? 'بدء طلبية جديدة وتصفير الكميات' : 'Start new order & reset quantities';
    newOrderHeroBtn.append(
      el('span', '', '✨'),
      el('span', 'ord-new-order-lbl', ar ? 'طلبية جديدة' : 'New Order')
    );
    newOrderHeroBtn.addEventListener('click', () => {
      promptStartNewOrder(() => renderOrdersView(root));
    });
    actions.append(newOrderHeroBtn);

    const basketBtn = el('button', 'ord-basket-btn');
    basketBtn.type = 'button';
    basketBtn.append(
      el('span', '', ar ? 'مراجعة الطلبية' : 'Order'),
      el('span', 'ord-basket-badge', String(selectedList.length))
    );
    basketBtn.addEventListener('click', () => ordGo('review'));
    actions.append(basketBtn);
    hero.append(actions);
    root.append(hero);

    const [page, param] = (ordRoute || 'home').split('/');

    // Helper for sticky bottom bar
    const appendBottomBar = (buildFn) => {
      const bar = el('nav', 'ord-bottom-bar');
      const inner = el('div', 'ord-bottom-inner');
      buildFn(inner);
      bar.append(inner);
      root.append(bar);
      root.style.paddingBottom = 'calc(146px + env(safe-area-inset-bottom, 16px))';
    };

    const appendGeneralBottomBar = () => {
      appendBottomBar((inner) => {
        const info = el('div', '');
        info.style.minWidth = '110px';
        info.append(
          el('strong', '', String(selectedList.length) + ' '),
          el('span', '', ar ? 'أصناف مطلوبة' : 'items in order')
        );
        const revBtn = el('button', 'btn primary', ar ? 'مراجعة وإرسال الطلبية ←' : 'Review order →');
        revBtn.type = 'button';
        revBtn.addEventListener('click', () => ordGo('review'));
        inner.append(info, revBtn);
      });
    };

    // =========================================================================
    // PAGE 1: HOME (Sections: FOH Store Supplies, Bar, Wine, Fresh & Fruti Bar)
    // =========================================================================
    if (page === 'home') {
      root.append(buildOrdBreadcrumbs());
      root.append(
        el('div', 'ord-kicker', '01 / CHOOSE A SECTION · اختر القسم'),
        el('h2', 'ord-page-title', ar ? 'تحضير طلبية الصالة والبار' : "Let's stock the floor & bar."),
        el(
          'p',
          'ord-page-sub',
          ar
            ? 'اختر القسم ثم الكاتيجوري. يمكنك الجرد صنفًا بصنف (Step-by-step) أو من القائمة السريعة (Quick list).'
            : 'Choose a section, then a category. Check items one at a time (Step-by-step) or use Quick list.'
        )
      );

      const newOrderCard = el('div', 'ord-new-order-banner');
      const bTxt = el('div', 'ord-new-order-banner-txt');
      bTxt.append(
        el('b', '', ar ? '✨ بدء دورة طلبية جديدة' : '✨ Start Fresh Order Cycle'),
        el('p', '', ar ? 'تصفير كميات الطلبية السابقة بضغطة واحدة دون الحاجة لمسح كل صنف يدويًا.' : 'Reset all previous quantities with one click instead of erasing items one-by-one.')
      );
      const bBtn = el('button', 'btn primary ord-banner-act-btn', ar ? '+ طلبية جديدة' : '+ New Order');
      bBtn.type = 'button';
      bBtn.addEventListener('click', () => {
        promptStartNewOrder(() => renderOrdersView(root));
      });
      newOrderCard.append(bTxt, bBtn);
      root.append(newOrderCard);

      if (ordDB.order.lastItem && ordById(ordDB.order.lastItem)) {
        const lastIt = ordById(ordDB.order.lastItem);
        const resBox = el('div', 'ord-resume-box');
        const txt = el('div', '');
        txt.append(
          el('small', '', ar ? 'أكمل من حيث توقفت:' : 'Continue where you left off:'),
          el('b', '', ' ' + lastIt.name)
        );
        const contBtn = el('button', 'btn primary', ar ? 'متابعة ←' : 'Continue →');
        contBtn.type = 'button';
        contBtn.style.minHeight = '36px';
        contBtn.addEventListener('click', () => ordGo('item/' + lastIt.id));
        resBox.append(txt, contBtn);
        root.append(resBox);
      }

      const secCards = el('div', 'ord-sec-cards');
      const allowed = allowedGroupsForCurrentRole();
      allowed.forEach(([gid, g], idx) => {
        const gItems = ordDB.catalog.items.filter((i) => i.group === gid && !i.deletedAt);
        const gCats = ordDB.catalog.categories.filter((c) => c.group === gid && !c.deletedAt);
        const reqInGroup = gItems.filter((i) => ordLine(i.id).qty > 0).length;

        const btn = el('button', 'ord-sec-card' + (idx === 0 ? ' featured' : ''));
        btn.type = 'button';
        const glyph = el('span', 'ord-sec-glyph', g.icon || '🍾');
        const body = el('span', 'ord-sec-body');
        body.append(
          el('b', '', (ar ? g.nameAr || g.name : g.name) + (reqInGroup ? ` (${reqInGroup})` : '')),
          el(
            'small',
            '',
            `${ar ? g.subAr || g.sub : g.sub} · ${gItems.length} ${ar ? 'صنف' : 'items'} · ${gCats.length} ${ar ? 'كاتيجوري' : 'categories'}`
          )
        );
        const arr = el('span', 'ord-sec-arrow', ar ? '←' : '→');
        btn.append(glyph, body, arr);
        btn.addEventListener('click', () => ordGo('types/' + gid));
        secCards.append(btn);
      });
      root.append(secCards);
      appendGeneralBottomBar();
      return;
    }

    // =========================================================================
    // PAGE 2: TYPES / CATEGORIES GRID INSIDE A SECTION (types/:group)
    // =========================================================================
    if (page === 'types' && ordDB.catalog.groups[param]) {
      const gid = param;
      const g = ordDB.catalog.groups[gid];
      const cats = ordDB.catalog.categories.filter((c) => c.group === gid && !c.deletedAt);

      root.append(buildOrdBreadcrumbs(gid));
      root.append(
        el('div', 'ord-kicker', '02 / CHOOSE A CATEGORY · اختر الكاتيجوري'),
        el('h2', 'ord-page-title', ar ? g.nameAr || g.name : g.name),
        el('p', 'ord-page-sub', ar ? 'اختر الكاتيجوري لبدء فحص الأصناف وتحديد الكميات المطلوبة.' : 'Pick a category to check items and enter order quantities.')
      );

      const grid = el('div', 'ord-type-grid');
      cats.forEach((c) => {
        const list = ordCatItems(c.id);
        const done = ordCatDone(c.id);
        const skipped = ordCatSkipped(c.id);
        const ordered = list.filter((i) => ordLine(i.id).qty > 0).length;
        const pct = list.length ? Math.round((100 * done) / list.length) : 0;

        const card = el('button', 'ord-type-card');
        card.type = 'button';

        const top = el('div', 'ord-type-top');
        top.append(
          el('span', '', list.length && done + skipped === list.length ? '✓' : '◦'),
          ordered ? el('span', 'ord-picked-pill', ordered + (ar ? ' مطلوب' : ' ordered')) : el('span', '', '')
        );

        const title = el('b', '', ar ? c.nameAr || c.name : c.name);
        const bottom = el('div', 'ord-type-bottom');
        bottom.append(
          el(
            'span',
            '',
            `${list.length} ${ar ? 'صنف' : 'items'}${done ? ` · ${done} ✓` : ''}${skipped ? ` · ${skipped} ↷` : ''}`
          ),
          el('span', '', ar ? '←' : '→')
        );

        const rail = el('div', 'ord-rail');
        const fill = el('div', '');
        fill.style.width = pct + '%';
        rail.append(fill);

        card.append(top, title, bottom, rail);
        card.addEventListener('click', () => ordGo('products/' + c.id));
        grid.append(card);
      });

      root.append(grid);
      appendGeneralBottomBar();
      return;
    }

    // =========================================================================
    // PAGE 3: CATEGORY ITEMS (products/:cat) — STEP-BY-STEP OVERVIEW OR QUICK LIST
    // =========================================================================
    if (page === 'products' && ordCat(param)) {
      const c = ordCat(param);
      const allCatItems = ordCatItems(c.id);
      const isQuickList = ordDB.preferences.viewMode === 'list';

      root.append(buildOrdBreadcrumbs(c.group, c.id));
      root.append(
        el('div', 'ord-kicker', isQuickList ? '03 / QUICK LIST · القائمة السريعة' : '03 / STEP-BY-STEP · فحص الأصناف'),
        el('h2', 'ord-page-title', ar ? c.nameAr || c.name : c.name),
        el(
          'p',
          'ord-page-sub',
          isQuickList
            ? ar
              ? 'أدخل الكميات مباشرة في القائمة السريعة، أو انتقل إلى وضع صنفًا بصنف (Step-by-step).'
              : 'Enter quantities directly in Quick list, or switch to Step-by-step guided check.'
            : ar
            ? 'اضغط البدء لفحص الأصناف واحدًا تلو الآخر مع المخزون، أو انتقل إلى القائمة السريعة.'
            : 'Start guided item-by-item check with stock reference, or switch to Quick list.'
        )
      );

      root.append(buildOrdViewSwitch(c.id, isQuickList ? 'list' : 'step'));

      if (!isQuickList) {
        // ---- STEP-BY-STEP CATEGORY LANDING ----
        const pending = ordPendingItem(c.id);
        const startItem = pending || allCatItems[0];
        if (startItem) {
          const startBtn = el(
            'button',
            'btn primary',
            (pending && (ordCatDone(c.id) || ordCatSkipped(c.id))
              ? ar
                ? 'متابعة الأصناف غير المفحوصة'
                : 'Continue unchecked items'
              : ar
              ? 'البدء بفحص الأصناف (Step-by-step)'
              : 'Start checking items') + (ar ? ' ←' : ' →')
          );
          startBtn.type = 'button';
          startBtn.style.width = '100%';
          startBtn.style.minHeight = '48px';
          startBtn.style.marginBottom = '12px';
          startBtn.addEventListener('click', () => ordGo('item/' + startItem.id));
          root.append(startBtn);
        }

        const searchIn = el('input', 'in');
        searchIn.type = 'search';
        searchIn.placeholder = ar ? 'ابحث داخل هذا الكاتيجوري...' : 'Search this category…';
        searchIn.value = ordProductSearch;
        searchIn.style.marginBottom = '10px';
        searchIn.addEventListener('input', () => {
          ordProductSearch = searchIn.value;
          renderOrdersView(root);
          const inp = root.querySelector('input[type="search"]');
          if (inp) {
            inp.focus();
            inp.setSelectionRange(ordProductSearch.length, ordProductSearch.length);
          }
        });
        root.append(searchIn);

        const q = ordProductSearch.trim().toLowerCase();
        const filtered = allCatItems.filter(
          (i) => !q || (i.name + ' ' + (i.ar || '') + ' ' + i.id).toLowerCase().includes(q)
        );

        const metaRow = el('div', '');
        metaRow.style.display = 'flex';
        metaRow.style.justifyContent = 'space-between';
        metaRow.style.fontSize = '0.76rem';
        metaRow.style.color = 'var(--ink2)';
        metaRow.style.marginBottom = '8px';
        metaRow.append(
          el('span', '', `${filtered.length} ${ar ? 'صنف' : 'items'}`),
          el('span', '', `${ordCatDone(c.id)} ${ar ? 'مفحوص' : 'checked'} · ${ordCatSkipped(c.id)} ${ar ? 'مُتخطى' : 'skipped'}`)
        );
        root.append(metaRow);

        const listWrap = el('div', 'ord-product-list');
        filtered.forEach((i) => {
          const l = ordLine(i.id);
          const idxInCat = allCatItems.findIndex((x) => x.id === i.id) + 1;
          const isVisited = !!ordDB.order.visited[i.id];
          const isSkipped = !!ordDB.order.skipped[i.id];

          const row = el('button', 'ord-product-pick');
          row.type = 'button';
          const num = el('span', 'ord-pick-num' + (isVisited ? ' done' : ''), isVisited ? '✓' : isSkipped ? '↷' : String(idxInCat));
          const nm = el('span', 'ord-pick-name');
          nm.append(
            el('b', '', ar && i.ar ? `${i.ar} · ${i.name}` : i.name),
            el('small', '', `${ar ? 'المخزون' : 'Stock'}: ${ordStockLabel(i)}${i.packSize ? ' · ' + i.packSize : ''}`)
          );
          row.append(num, nm);
          if (l.qty > 0) {
            row.append(el('span', 'ord-pick-req', `${l.qty} ${ordUnitText(l.qty, l.unit || i.unit)}`));
          } else {
            row.append(el('span', '', ar ? '←' : '→'));
          }
          row.addEventListener('click', () => ordGo('item/' + i.id));
          listWrap.append(row);
        });
        root.append(listWrap);
        appendGeneralBottomBar();
        return;
      }

      // ---- QUICK LIST MODE (viewMode === 'list') ----
      const toolbar = el('div', 'ord-toolbar');
      const qSearch = el('input', 'in ord-search-in');
      qSearch.type = 'search';
      qSearch.placeholder = ar ? 'ابحث في القائمة السريعة...' : 'Search quick list…';
      qSearch.value = ordQuickSearch;
      qSearch.addEventListener('input', () => {
        ordQuickSearch = qSearch.value;
        renderOrdersView(root);
        const inp = root.querySelector('.ord-toolbar input');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(ordQuickSearch.length, ordQuickSearch.length);
        }
      });

      const reqToggle = el(
        'button',
        'btn' + (ordQuickOnlyRequested ? ' primary' : ''),
        ar
          ? `المطلوب فقط (${allCatItems.filter((i) => ordLine(i.id).qty > 0).length})`
          : `Requested (${allCatItems.filter((i) => ordLine(i.id).qty > 0).length})`
      );
      reqToggle.type = 'button';
      reqToggle.addEventListener('click', () => {
        ordQuickOnlyRequested = !ordQuickOnlyRequested;
        renderOrdersView(root);
      });

      const newOrderBtn = el(
        'button',
        'ord-new-order-btn',
        ar ? '✨ طلبية جديدة' : '✨ New order'
      );
      newOrderBtn.type = 'button';
      newOrderBtn.title = ar ? 'تصفير كميات الطلبية والبدء بطلبية جديدة فارغة' : 'Reset quantities & start fresh order';
      newOrderBtn.addEventListener('click', () => {
        promptStartNewOrder(() => renderOrdersView(root));
      });

      toolbar.append(qSearch, reqToggle, newOrderBtn);
      root.append(toolbar);

      const q = ordQuickSearch.trim().toLowerCase();
      const visible = allCatItems.filter(
        (i) =>
          (!q || (i.name + ' ' + (i.ar || '') + ' ' + i.id).toLowerCase().includes(q)) &&
          (!ordQuickOnlyRequested || ordLine(i.id).qty > 0)
      );

      const statsLine = el(
        'p',
        'ord-page-sub',
        `${allCatItems.filter((i) => ordLine(i.id).qty > 0).length} ${ar ? 'مطلوب' : 'requested'} · ${ordCatDone(c.id)} ${ar ? 'مفحوص' : 'checked'} · ${ordCatSkipped(c.id)} ${ar ? 'مُتخطى' : 'skipped'}`
      );
      root.append(statsLine);

      if (!visible.length) {
        const emp = el('div', 'ord-empty-state', ar ? 'لا توجد أصناف مطابقة.' : 'No matching items.');
        root.append(emp);
      } else {
        const listContainer = el('div', 'ord-quick-list-container');
        visible.forEach((i) => {
          const l = ordLine(i.id);
          const row = el('div', 'ord-quick-item-row' + (l.qty > 0 ? ' has-qty' : ''));
          row.dataset.itemId = i.id;

          // 1. Edit squircle button (Left)
          const editBtn = el('button', 'ord-quick-edit-btn');
          editBtn.type = 'button';
          editBtn.setAttribute('aria-label', ar ? `تعديل صنف ${i.name}` : `Edit ${i.name}`);
          editBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          `;
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ordGo('item/' + i.id);
          });

          // 2. Middle item info (Name + Subtitle: 0 / 8* · bottles)
          const info = el('div', 'ord-quick-item-info');
          info.addEventListener('click', () => ordGo('item/' + i.id));

          const nameEl = el('div', 'ord-quick-item-title', i.name);
          if (ar && i.ar && i.ar !== i.name) {
            nameEl.title = i.ar;
          }

          const subEl = el('div', 'ord-quick-qty-sub');
          const unitPlural = ORD_PLURALS[l.unit || i.unit] || (l.unit || i.unit || 'bottles');
          const denom = ordStockDenominator(i);

          const qtyB = el('b', 'ord-quick-qty-num', String(l.qty));
          const restSpan = el('span', '', ` / ${denom} · ${unitPlural}`);
          subEl.append(qtyB, restSpan);
          info.append(nameEl, subEl);

          // 3. Right stepper (- and +)
          const stepper = el('div', 'ord-quick-stepper');
          const minus = el('button', 'ord-stepper-btn ord-btn-minus', '−');
          minus.type = 'button';
          minus.setAttribute('aria-label', ar ? `إنقاص ${i.name}` : `Decrease ${i.name}`);

          const plus = el('button', 'ord-stepper-btn ord-btn-plus', '+');
          plus.type = 'button';
          plus.setAttribute('aria-label', ar ? `زيادة ${i.name}` : `Increase ${i.name}`);

          const step = ['kg', 'liter'].includes(l.unit || i.unit) ? 0.25 : 1;

          const applyQuickQty = (nextQty) => {
            const cleanQ = Math.max(0, Math.min(9999, Math.round((Number(nextQty) || 0) * 100) / 100));
            ordDB.order.lines[i.id] = {
              qty: cleanQ,
              unit: l.unit || i.unit || 'bottle',
              note: l.note || '',
              stock: l.stock || '',
            };
            if (cleanQ > 0) {
              ordDB.order.visited[i.id] = true;
              delete ordDB.order.skipped[i.id];
            }
            saveOrdersDB();

            // Direct DOM update
            l.qty = cleanQ;
            qtyB.textContent = String(cleanQ);
            if (cleanQ > 0) {
              row.classList.add('has-qty');
            } else {
              row.classList.remove('has-qty');
              if (ordQuickOnlyRequested) {
                row.remove();
              }
            }
            updateOrderBadge();
            if (FOH.haptics && FOH.haptics.impact) {
              FOH.haptics.impact('light');
            }
          };

          minus.addEventListener('click', (e) => {
            e.stopPropagation();
            const current = Number(l.qty) || 0;
            if (current > 0) {
              applyQuickQty(current - step);
            }
          });

          plus.addEventListener('click', (e) => {
            e.stopPropagation();
            const current = Number(l.qty) || 0;
            applyQuickQty(current + step);
          });

          stepper.append(minus, plus);
          row.append(editBtn, info, stepper);
          listContainer.append(row);
        });
        root.append(listContainer);
      }

      appendBottomBar((inner) => {
        const revBtn = el('button', 'btn', ar ? 'مراجعة الطلبية' : 'Review order');
        revBtn.type = 'button';
        revBtn.addEventListener('click', () => ordGo('review'));

        const doneCatBtn = el('button', 'btn primary', ar ? 'إنهاء هذا الكاتيجوري ←' : 'Done with category →');
        doneCatBtn.type = 'button';
        doneCatBtn.addEventListener('click', () => {
          allCatItems.forEach((i) => {
            if (ordLine(i.id).qty > 0) {
              ordDB.order.visited[i.id] = true;
              delete ordDB.order.skipped[i.id];
            }
          });
          ordSkipRemaining(c.id);
          saveOrdersDB();
          ordGo('complete/' + c.id);
        });
        inner.append(revBtn, doneCatBtn);
      });
      return;
    }

    // =========================================================================
    // PAGE 4: SINGLE ITEM STEP-BY-STEP CARD (item/:id)
    // =========================================================================
    if (page === 'item' && ordById(param)) {
      const i = ordById(param);
      const c = ordCat(i.cat);
      const g = ordDB.catalog.groups[i.group];
      const list = ordCatItems(i.cat);
      const idx = list.findIndex((x) => x.id === i.id);
      const l = ordLine(i.id);

      ordDB.order.lastItem = i.id;
      saveOrdersDB();

      root.append(buildOrdBreadcrumbs(i.group, i.cat));
      root.append(buildOrdViewSwitch(i.cat, 'step'));

      const progHead = el('div', '');
      progHead.style.display = 'flex';
      progHead.style.justifyContent = 'space-between';
      progHead.style.alignItems = 'center';
      progHead.style.fontSize = '0.8rem';
      progHead.style.color = 'var(--ink2)';
      progHead.append(
        el('span', '', ar ? `الصنف ${idx + 1} من ${list.length}` : `Item ${idx + 1} of ${list.length}`)
      );
      const pickOtherBtn = el('button', '', ar ? 'اختر صنفًا آخر ☷' : 'Choose another item ☷');
      pickOtherBtn.type = 'button';
      pickOtherBtn.style.border = '0';
      pickOtherBtn.style.background = 'transparent';
      pickOtherBtn.style.color = 'var(--accent)';
      pickOtherBtn.style.fontWeight = '700';
      pickOtherBtn.style.cursor = 'pointer';
      pickOtherBtn.addEventListener('click', () => ordGo('products/' + i.cat));
      progHead.append(pickOtherBtn);
      root.append(progHead);

      const rail = el('div', 'ord-rail');
      const fill = el('div', '');
      fill.style.width = Math.round((100 * (idx + 1)) / Math.max(1, list.length)) + '%';
      rail.append(fill);
      root.append(rail);

      const card = el('article', 'ord-item-card');
      const head = el('div', 'ord-item-head');
      head.append(el('span', 'ord-sec-glyph', (g && g.icon) || '🍾'));
      const titleBox = el('div', 'ord-item-Title');
      titleBox.append(
        el('small', '', ar ? c.nameAr || c.name : c.name),
        el('h3', '', ar && i.ar ? `${i.ar} · ${i.name}` : i.name),
        el('small', '', i.packSize || i.id.toUpperCase())
      );
      head.append(titleBox);
      card.append(head);

      // Stock Panel
      const stockBox = el('div', 'ord-stock-panel');
      const stockLeft = el('div', '');
      stockLeft.append(
        el(
          'b',
          '',
          i.stockQty !== null && i.stockQty !== undefined
            ? ar
              ? 'المخزون الفعلي المسجّل'
              : 'Recorded stock'
            : ar
            ? 'المخزون المرجعي في ملف البار'
            : 'Stock in source file'
        ),
        el(
          'small',
          '',
          i.stockQty !== null && i.stockQty !== undefined
            ? ar
              ? 'مؤكد على هذا الجهاز'
              : 'Confirmed stock count'
            : ar
            ? 'مرجعي فقط · يمكنك تحديث الجرد الفعلي الآن'
            : 'Reference only · tap Edit stock to confirm'
        )
      );
      const editStockBtn = el('button', 'btn', '✎ ' + (ar ? 'تحديث المخزون' : 'Edit stock'));
      editStockBtn.type = 'button';
      editStockBtn.style.minHeight = '32px';
      editStockBtn.style.padding = '2px 10px';
      editStockBtn.style.marginTop = '6px';
      editStockBtn.style.fontSize = '0.75rem';
      editStockBtn.addEventListener('click', () => promptEditStock(i));
      stockLeft.append(editStockBtn);

      const stockRight = el('div', '');
      stockRight.style.textAlign = 'end';
      stockRight.append(el('div', 'ord-stock-val', ordStockLabel(i)));
      stockBox.append(stockLeft, stockRight);
      card.append(stockBox);

      // Order / Stock Stepper
      const lbl = el('div', '');
      lbl.style.display = 'flex';
      lbl.style.justifyContent = 'space-between';
      lbl.style.fontWeight = '700';
      lbl.style.fontSize = '0.88rem';
      lbl.style.marginTop = '14px';
      lbl.append(
        el('span', '', ar ? 'كم الكمية المطلوبة للطلبية؟' : 'How much do you need?'),
        el('small', '', 'Order / Stock')
      );
      card.append(lbl);

      const qtyRow = el('div', 'ord-qty-row');
      const stepper = el('div', 'ord-stepper-lg');
      const minus = el('button', '', '−');
      minus.type = 'button';
      const qtyIn = el('input', '');
      qtyIn.type = 'number';
      qtyIn.min = '0';
      qtyIn.max = '9999';
      qtyIn.step = ['kg', 'liter'].includes(l.unit || i.unit) ? '0.25' : '1';
      qtyIn.value = String(l.qty);

      const denom = el('span', 'ord-denom');
      denom.append('/ ', el('b', '', ordStockDenominator(i)));

      const plus = el('button', '', '+');
      plus.type = 'button';
      stepper.append(minus, qtyIn, denom, plus);

      const unitSel = el('select', 'in ord-unit-sel');
      Object.entries(ORD_UNITS).forEach(([uk, uLabel]) => {
        const opt = el('option', '', uLabel);
        opt.value = uk;
        opt.selected = uk === (l.unit || i.unit || 'bottle');
        unitSel.append(opt);
      });
      qtyRow.append(stepper, unitSel);
      card.append(qtyRow);

      const hintP = el('p', 'setting-note', ordStockRatioHint(i, l.unit || i.unit));
      hintP.style.marginTop = '8px';
      card.append(hintP);

      const noteIn = el('input', 'in');
      noteIn.style.marginTop = '10px';
      noteIn.placeholder = i.ambiguous
        ? ar
          ? 'حدد النكهة المطلوبة في الملاحظة *'
          : 'Specify the flavour for this record *'
        : ar
        ? 'ملاحظة على الصنف (حجم العبوة، تعليمات خاصة...)'
        : 'Order note (size, packaging or special instructions)';
      noteIn.value = l.note || '';
      card.append(noteIn);

      const saveCurrentItem = () => {
        const cleanQ = Math.max(0, Math.min(9999, Math.round((Number(qtyIn.value) || 0) * 100) / 100));
        ordDB.order.lines[i.id] = {
          qty: cleanQ,
          unit: unitSel.value || i.unit || 'bottle',
          note: noteIn.value.trim(),
          stock: l.stock || '',
        };
        if (cleanQ > 0) delete ordDB.order.skipped[i.id];
        saveOrdersDB();
        const bBadge = root.querySelector('.ord-basket-badge');
        if (bBadge) bBadge.textContent = String(ordSelectedItems().length);
      };

      minus.addEventListener('click', () => {
        const step = ['kg', 'liter'].includes(unitSel.value) ? 0.25 : 1;
        qtyIn.value = String(Math.max(0, Math.round(((Number(qtyIn.value) || 0) - step) * 100) / 100));
        saveCurrentItem();
        updateOrderBadge();
      });
      plus.addEventListener('click', () => {
        const step = ['kg', 'liter'].includes(unitSel.value) ? 0.25 : 1;
        qtyIn.value = String(Math.min(9999, Math.round(((Number(qtyIn.value) || 0) + step) * 100) / 100));
        saveCurrentItem();
        updateOrderBadge();
      });
      qtyIn.addEventListener('input', () => {
        saveCurrentItem();
        updateOrderBadge();
      });
      unitSel.addEventListener('change', () => saveCurrentItem());
      noteIn.addEventListener('input', () => saveCurrentItem());

      root.append(card);

      appendBottomBar((inner) => {
        const prevBtn = el('button', 'btn', ar ? '→ السابق' : '← Previous');
        prevBtn.type = 'button';
        prevBtn.disabled = idx <= 0;
        prevBtn.addEventListener('click', () => {
          saveCurrentItem();
          if (idx > 0) ordGo('item/' + list[idx - 1].id);
        });

        const nextLabel = ordReturnToReview
          ? ar
            ? 'حفظ والعودة للمراجعة'
            : 'Save & return'
          : idx === list.length - 1
          ? ar
            ? 'إنهاء الكاتيجوري ←'
            : 'Finish category →'
          : ar
          ? 'التالي ←'
          : 'Next →';
        const nextBtn = el('button', 'btn primary', nextLabel);
        nextBtn.type = 'button';
        nextBtn.addEventListener('click', () => {
          saveCurrentItem();
          ordDB.order.visited[i.id] = true;
          delete ordDB.order.skipped[i.id];
          saveOrdersDB();
          if (ordReturnToReview) {
            ordReturnToReview = false;
            ordGo('review');
          } else if (idx + 1 < list.length) {
            ordGo('item/' + list[idx + 1].id);
          } else {
            ordGo('complete/' + i.cat);
          }
        });

        inner.append(prevBtn, nextBtn);

        if (!ordReturnToReview) {
          const skipBtn = el(
            'button',
            'ord-skip-rest',
            ar ? 'تخطي بقية الأصناف في هذا الكاتيجوري · مع حفظ كمياتي' : 'Skip remaining · keep my quantities'
          );
          skipBtn.type = 'button';
          skipBtn.addEventListener('click', () => {
            saveCurrentItem();
            ordDB.order.visited[i.id] = true;
            delete ordDB.order.skipped[i.id];
            ordSkipRemaining(i.cat, i.id);
            saveOrdersDB();
            ordGo('complete/' + i.cat);
          });
          inner.append(skipBtn);
        }
      });
      return;
    }

    // =========================================================================
    // PAGE 5: CATEGORY COMPLETE SUMMARY (complete/:cat)
    // =========================================================================
    if (page === 'complete' && ordCat(param)) {
      const c = ordCat(param);
      const list = ordCatItems(c.id);
      const done = ordCatDone(c.id);
      const skipped = ordCatSkipped(c.id);
      const pending = ordPendingItem(c.id);
      const reqCount = list.filter((i) => ordLine(i.id).qty > 0).length;

      root.append(buildOrdBreadcrumbs(c.group, c.id));
      const box = el('section', 'card');
      box.style.padding = '18px';
      box.style.textAlign = 'center';
      box.append(
        el('div', '', '✅'),
        el('h2', 'ord-page-title', pending ? (ar ? 'تم حفظ كمياتك' : 'Your quantities are saved') : ar ? 'اكتمل فحص الكاتيجوري' : 'Category finished'),
        el(
          'p',
          'ord-page-sub',
          ar
            ? 'تم حفظ الأصناف المطلوبة في سلة الطلبية. يمكنك اختيار كاتيجوري آخر أو مراجعة الطلبية الكاملة.'
            : 'Your requested quantities are saved. Choose another category or review the full order.'
        )
      );

      const stats = el('div', 'ord-stats-grid');
      [
        [reqCount, ar ? 'أصناف مطلوبة' : 'Requested items'],
        [done, ar ? 'تم فحصها' : 'Checked'],
        [skipped, ar ? 'تم تخطيها' : 'Skipped'],
      ].forEach(([val, lbl]) => {
        const s = el('div', 'ord-stat-box');
        s.append(el('strong', '', String(val)), el('span', '', lbl));
        stats.append(s);
      });
      box.append(stats);

      const actCol = el('div', '');
      actCol.style.display = 'flex';
      actCol.style.flexDirection = 'column';
      actCol.style.gap = '8px';

      if (pending) {
        const contB = el('button', 'btn primary', ar ? 'متابعة الأصناف غير المفحوصة ←' : 'Continue unchecked items →');
        contB.type = 'button';
        contB.addEventListener('click', () => ordGo('item/' + pending.id));
        actCol.append(contB);
      }

      const anotherCatB = el('button', pending ? 'btn' : 'btn primary', ar ? 'اختيار كاتيجوري آخر في هذا القسم' : 'Choose another category');
      anotherCatB.type = 'button';
      anotherCatB.addEventListener('click', () => ordGo('types/' + c.group));
      actCol.append(anotherCatB);

      if (skipped > 0) {
        const revSkipB = el('button', 'btn', ar ? `مراجعة الأصناف المتخطاة (${skipped})` : `Revisit skipped items (${skipped})`);
        revSkipB.type = 'button';
        revSkipB.addEventListener('click', () => {
          const firstSkipped = list.find((i) => ordDB.order.skipped[i.id]);
          list.forEach((i) => delete ordDB.order.skipped[i.id]);
          saveOrdersDB();
          if (firstSkipped) ordGo('item/' + firstSkipped.id);
        });
        actCol.append(revSkipB);
      }

      const quickB = el('button', 'btn', ar ? 'عرض كل الأصناف في القائمة السريعة (Quick list)' : 'View all quantities in Quick list');
      quickB.type = 'button';
      quickB.addEventListener('click', () => {
        ordDB.preferences.viewMode = 'list';
        saveOrdersDB();
        ordGo('products/' + c.id);
      });

      const homeB = el('button', 'btn', ar ? 'اختيار قسم آخر (صالة / بار / نبيذ)' : 'Choose another section');
      homeB.type = 'button';
      homeB.addEventListener('click', () => ordGo('home'));

      const reviewB = el('button', 'btn', ar ? 'مراجعة الطلبية الكاملة وإرسال WhatsApp' : 'Review full order');
      reviewB.type = 'button';
      reviewB.addEventListener('click', () => ordGo('review'));

      actCol.append(quickB, homeB, reviewB);
      box.append(actCol);
      root.append(box);
      appendGeneralBottomBar();
      return;
    }

    // =========================================================================
    // PAGE 6: FULL ORDER REVIEW & WHATSAPP EXPORT (review)
    // =========================================================================
    root.append(buildOrdBreadcrumbs(null, null, ar ? 'مراجعة الطلبية' : 'Review order'));
    root.append(
      el('div', 'ord-kicker', '04 / REVIEW & SEND · مراجعة وإرسال الطلبية'),
      el('h2', 'ord-page-title', (ar ? 'مراجعة الطلبية الكاملة (' : 'Review order (') + selectedList.length + ')')
    );

    const metaCard = el('section', 'card');
    metaCard.style.padding = '14px';
    metaCard.append(el('h4', '', ar ? '📋 تفاصيل الطلبية' : '📋 Order details'));
    const m = ordDB.order.meta;
    const requester = (session && session.displayName) || S.me.name || m.requester || 'Staff';
    const orderDate = S.date || FOH.time.todayISO();
    m.requester = requester;
    m.orderDate = orderDate;
    m.destination = 'Store';
    m.priority = 'Normal';

    // Automatic details banner (Requester, Date, Warehouse are 100% automated)
    const autoBanner = el('div', 'ord-meta-auto-banner');
    autoBanner.append(
      el('div', 'ord-meta-pill', `👤 ${requester}`),
      el('div', 'ord-meta-pill', `📅 ${orderDate}`),
      el('div', 'ord-meta-pill', `📦 ${ar ? 'المستودع الرئيسي' : 'Store Warehouse'}`)
    );

    const noteLbl = el('label', '', ar ? 'ملاحظة عامة على الطلبية (اختياري)' : 'General order note (optional)');
    noteLbl.style.display = 'block';
    noteLbl.style.marginTop = '10px';
    const noteIn = el('input', 'in');
    noteIn.value = m.orderNote || '';
    noteIn.placeholder = ar ? 'مثال: يرجى التجهيز قبل الساعة 5 مساءً...' : 'e.g. Please prepare before 5 pm';
    noteIn.addEventListener('input', () => {
      m.orderNote = noteIn.value;
      saveOrdersDB();
    });
    noteLbl.append(noteIn);
    metaCard.append(autoBanner, noteLbl);
    root.append(metaCard);

    if (!selectedList.length) {
      const emp = el('section', 'card');
      emp.append(
        el('p', 'empty', ar ? 'لم تقم بطلب أي صنف بعد. اختر قسمًا وكاتيجوري لإضافة الكميات.' : 'No items requested yet. Choose a section and category to add quantities.')
      );
      root.append(emp);
    } else {
      const listCard = el('section', 'card');
      listCard.style.padding = '12px 14px';
      let lastCat = '';
      selectedList.forEach((i) => {
        const l = ordLine(i.id);
        if (lastCat !== i.cat) {
          const gName = (ordDB.catalog.groups[i.group] && (ar ? ordDB.catalog.groups[i.group].nameAr : ordDB.catalog.groups[i.group].name)) || i.group;
          const cName = (ordCat(i.cat) && (ar ? ordCat(i.cat).nameAr : ordCat(i.cat).name)) || i.cat;
          const secH = el('div', '');
          secH.style.fontWeight = '800';
          secH.style.fontSize = '0.8rem';
          secH.style.color = 'var(--accent)';
          secH.style.padding = '8px 0 4px';
          secH.style.borderBottom = '1px solid var(--line)';
          secH.textContent = `${gName} / ${cName}`;
          listCard.append(secH);
          lastCat = i.cat;
        }

        const rLine = el('div', '');
        rLine.style.display = 'flex';
        rLine.style.alignItems = 'center';
        rLine.style.justifyContent = 'space-between';
        rLine.style.gap = '8px';
        rLine.style.padding = '9px 0';
        rLine.style.borderBottom = '1px dashed var(--line)';

        const info = el('div', '');
        info.style.flex = '1';
        info.append(
          el('b', '', ar && i.ar ? `${i.ar} · ${i.name}` : i.name),
          el('small', '', `${l.note ? '📝 ' + l.note + ' · ' : ''}${ar ? 'المخزون' : 'Stock'}: ${ordStockLabel(i)}`)
        );
        info.querySelector('small').style.display = 'block';
        info.querySelector('small').style.color = 'var(--ink2)';

        const right = el('div', '');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '6px';
        right.append(
          el('strong', 'ord-picked-pill', `${l.qty} / ${ordStockDenominator(i)} ${ordUnitText(l.qty, l.unit || i.unit)}`)
        );

        const editB = el('button', 'btn', '✎');
        editB.type = 'button';
        editB.style.minHeight = '32px';
        editB.style.padding = '0 8px';
        editB.addEventListener('click', () => {
          ordReturnToReview = true;
          ordGo('item/' + i.id);
        });

        const delB = el('button', 'btn danger', '✕');
        delB.type = 'button';
        delB.style.minHeight = '32px';
        delB.style.padding = '0 8px';
        delB.addEventListener('click', () => {
          ordDB.order.lines[i.id] = { ...l, qty: 0 };
          saveOrdersDB();
          renderOrdersView(root);
        });

        right.append(editB, delB);
        rLine.append(info, right);
        listCard.append(rLine);
      });

      // WhatsApp Preview & Actions
      const incLbl = el('label', '');
      incLbl.style.display = 'flex';
      incLbl.style.alignItems = 'center';
      incLbl.style.gap = '8px';
      incLbl.style.marginTop = '12px';
      incLbl.style.fontSize = '0.82rem';
      incLbl.style.cursor = 'pointer';
      const incCb = el('input', '');
      incCb.type = 'checkbox';
      incCb.checked = ordIncludeStockInMsg;
      incCb.addEventListener('change', () => {
        ordIncludeStockInMsg = incCb.checked;
        renderOrdersView(root);
      });
      incLbl.append(incCb, el('span', '', ar ? 'تضمين المخزون الحالي في رسالة WhatsApp' : 'Include stock count in WhatsApp message'));
      listCard.append(incLbl);

      const msgText = buildOrdWhatsAppText(ordIncludeStockInMsg);
      const ta = el('textarea', 'ord-msg-box');
      ta.readOnly = true;
      ta.value = msgText;
      listCard.append(ta);

      const actRow = el('div', '');
      actRow.style.display = 'flex';
      actRow.style.flexWrap = 'wrap';
      actRow.style.gap = '8px';
      actRow.style.marginTop = '10px';

      const copyBtn = el('button', 'btn', ar ? '📋 نسخ النص' : '📋 Copy text');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(msgText);
          }
        } catch {}
        markWarehouseChecklistItemDone();
        FOH.edit.toast(t('ordCopied'));
      });

      const resetBtn = el('button', 'btn danger', ar ? 'بدء طلبية جديدة (تصفير الكميات)' : 'Start new order');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', () => {
        if (!confirm(ar ? 'هل تريد تصفير كميات الطلبية الحالية؟ (يبقى الكتالوج والمخزون محفوظًا)' : 'Clear current order quantities? Catalog and stock stay unchanged.')) return;
        ordDB.order = emptyOrderState();
        saveOrdersDB();
        ordGo('home');
      });

      actRow.append(copyBtn, resetBtn);
      listCard.append(actRow);
      root.append(listCard);
    }

    appendBottomBar((inner) => {
      const addMoreB = el('button', 'btn', ar ? '+ إضافة أصناف' : '+ Add items');
      addMoreB.type = 'button';
      addMoreB.addEventListener('click', () => ordGo('home'));

      const waB = el('button', 'btn primary', t('ordWhatsappBtn'));
      waB.type = 'button';
      waB.disabled = selectedList.length === 0;
      waB.addEventListener('click', async () => {
        const msgText = buildOrdWhatsAppText(ordIncludeStockInMsg);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(msgText);
          }
        } catch {}
        markWarehouseChecklistItemDone();
        FOH.edit.toast(t('ordCopied'));
        window.open('https://wa.me/?text=' + encodeURIComponent(msgText), '_blank', 'noopener');
      });
      inner.append(addMoreB, waB);
    });
  }


  FOH.ordersView = {
    emptyOrderState,
    loadOrdersDB,
    saveOrdersDB,
    allowedGroupsForCurrentRole,
    updateOrderBadge,
    renderOrdersView,
    buildOrdWhatsAppText,
    promptStartNewOrder,
    go: ordGo,
    ORD_SEED,
  };

  FOH.renderOrdersView = renderOrdersView;
  FOH.updateOrderBadge = updateOrderBadge;
})(window.FOH = window.FOH || {});
