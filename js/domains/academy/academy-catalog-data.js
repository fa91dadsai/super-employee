// Default Menu & Beverage Academy Catalog Data
(function (FOH) {
  'use strict';

  const DEFAULT_ACADEMY_ITEMS = [
    {
      id: 'dish_wagyu',
      cat: 'food',
      catLabelAr: '🥩 الأطباق الرئيسية',
      catLabelEn: '🥩 Main Dishes',
      nameAr: 'ستيك واغيو تندرلوين (Wagyu Tenderloin 250g)',
      nameEn: 'Wagyu Tenderloin Steak (250g)',
      descAr: 'قطعة تندرلوين واغيو أسترالي فاخرة (درجة رخامية MB7+) تُشوى على فحم السنديان وتُقدّم مع بيوريه البطاطا بالكمأة السوداء وصوص الديمي غلاس.',
      descEn: 'Charcoal-grilled Australian Wagyu Tenderloin (MB7+), served with black truffle potato purée and rich demi-glace.',
      ingredientsAr: 'لحم واغيو 250 غرام، زبدة الأعشاب، بيوريه بطاطا بالكمأة، فطر بري، صوص ديمي غلاس.',
      allergensAr: '⚠️ الحليب ومشتقات الألبان (الزبدة والبيوريه)، الكرفس (في الديمي غلاس). خالٍ من المكسرات.',
      pairingAr: '💡 اقترح معه كأس نبيذ أحمر Cabernet Sauvignon أو كوكتيل Smoky Old Fashioned، درجة الاستواء الموصى بها: Medium Rare.',
      questions: [
        {
          qAr: 'ما هي درجة الاستواء الموصى بها والمكونات المرافقة لطبق الواغيو تندرلوين؟',
          qEn: 'What is the recommended doneness and side for the Wagyu Tenderloin?',
          options: [
            'Medium Rare مع بيوريه البطاطا بالكمأة السوداء وصوص الديمي غلاس',
            'Well Done مع بطاطا مقلية وصوص الفلفل الأبيض',
            'Rare مع أرز بسمتي وصوص الليمون والزبدة',
          ],
          correct: 0,
        },
        {
          qAr: 'ما هي مسببات الحساسية الموجودة في طبق الواغيو تندرلوين؟',
          qEn: 'Which allergens are present in the Wagyu Tenderloin dish?',
          options: [
            'الفول السوداني والسمسم والسمك',
            'مشتقات الألبان (الزبدة والبيوريه) والكرفس في صوص الديمي غلاس',
            'البيض والمحار البحري والصويا',
          ],
          correct: 1,
        },
      ],
    },
    {
      id: 'dish_burrata',
      cat: 'food',
      catLabelAr: '🥗 المقبلات والسلطات',
      catLabelEn: '🥗 Starters & Salads',
      nameAr: 'سلطة البوراتا الإيطالية مع التين والبيستو (Burrata & Fig)',
      nameEn: 'Artisanal Burrata with Fresh Figs & Pistachio Pesto',
      descAr: 'جبنة بوراتا إيطالية كريمية طازجة تُقدّم على طبقة من الطماطم الكرزية المشوية، التين الطازج، صوص البيستو بالفستق الحلبي، وبلسميك معتّق.',
      descEn: 'Creamy Italian Burrata over roasted cherry tomatoes, fresh figs, pistachio basil pesto, and aged balsamic glaze.',
      ingredientsAr: 'جبنة بوراتا 150 غ، تين طازج، طماطم كرزية، ريحان، فستق حلبي، زيت زيتون بكر، بلسميك.',
      allergensAr: '⚠️ الألبان (جبنة البوراتا) والمكسرات (الفستق الحلبي في صوص البيستو). مناسب للنباتيين (Vegetarian).',
      pairingAr: '💡 مثالي للمشاركة في بداية الوجبة مع نبيذ أبيض Pinot Grigio أو البروسيكو (Prosecco).',
      questions: [
        {
          qAr: 'أي نوع مكسرات يدخل في تحضير صوص البيستو في سلطة البوراتا (مهم لحساسية المكسرات)؟',
          qEn: 'Which nut is used in the Burrata salad pesto (critical for nut allergies)?',
          options: [
            'اللوز المحمص',
            'الفستق الحلبي (Pistachio)',
            'الكاجو والجوز',
          ],
          correct: 1,
        },
        {
          qAr: 'ما هو المشروب الأنسب لاقتراحه (Pairing) مع سلطة البوراتا الإيطالية؟',
          qEn: 'What is the best beverage pairing to recommend with the Burrata salad?',
          options: [
            'Pinot Grigio أو Prosecco بارد',
            'قهوة إسبريسو داكنة',
            'ستوت بيرة ثقيلة (Dark Stout)',
          ],
          correct: 0,
        },
      ],
    },
    {
      id: 'drink_ceen_mule',
      cat: 'drink',
      catLabelAr: '🍸 الكوكتيلات والمشروبات',
      catLabelEn: '🍸 Signature Cocktails & Bar',
      nameAr: 'كوكتيل سين سيجنتشر (CEEN Mediterranean Mule)',
      nameEn: 'CEEN Mediterranean Mule (Signature Cocktail)',
      descAr: 'كوكتيل منعش متوازن يجمع بين الفودكا الفاخرة، شراب التين والروزماري المحضّر منزلياً، عصير اللايم الطازج، وجنجر بير فوار.',
      descEn: 'Refreshing signature mule blending premium vodka, house-made fig & rosemary cordial, fresh lime juice, and spicy ginger beer.',
      ingredientsAr: '50 مل فودكا Tito’s، 20 مل شراب التين والروزماري، 15 مل عصير لايم طازج، يُستكمل بـ Ginger Beer في كأس نحاسي مع ثلج مجروش.',
      allergensAr: '⚠️ خالٍ من مسببات الحساسية الشائعة (يحتوي على كحول). متوفر بنسخة Virgin بدون كحول.',
      pairingAr: '💡 يُقدّم في الكأس النحاسي المبرد مع غصن روزماري مدخّن وشريحة تين مجفف.',
      questions: [
        {
          qAr: 'ما هي المقادير الأساسية لكوكتيل CEEN Mediterranean Mule؟',
          qEn: 'What are the core specs for the CEEN Mediterranean Mule?',
          options: [
            '50 مل فودكا + 20 مل شراب التين والروزماري + 15 مل لايم + جنجر بير',
            '60 مل جين + 30 مل فيرموث أحمر + كامباري',
            '45 مل تيكيلا + 30 مل تريبل سيك + عصير برتقال',
          ],
          correct: 0,
        },
        {
          qAr: 'كيف يُقدّم كوكتيل CEEN Mediterranean Mule وما هو الغارنيش المعتمد؟',
          qEn: 'How is the CEEN Mediterranean Mule served and garnished?',
          options: [
            'في كأس مارتيني زجاجي مع زيتونة خضراء',
            'في كأس نحاسي مبرد مع غصن روزماري مدخّن وشريحة تين',
            'في كأس نبيذ أحمر كبير بدون ثلج',
          ],
          correct: 1,
        },
      ],
    },
    {
      id: 'drink_smoky_negroni',
      cat: 'drink',
      catLabelAr: '🍸 الكوكتيلات والمشروبات',
      catLabelEn: '🍸 Signature Cocktails & Bar',
      nameAr: 'سموكي نيجروني المعتّق (CEEN Barrel-Aged Smoky Negroni)',
      nameEn: 'CEEN Barrel-Aged Smoky Negroni',
      descAr: 'نسخة CEEN الخاصة من كوكتيل النيجروني الكلاسيكي، معتّقة مع خشب البلوط المدخّن وقشر البرتقال المحروق.',
      descEn: 'Our signature twist on the classic Negroni, infused with toasted oak smoke and flamed orange peel.',
      ingredientsAr: '30 مل جين Hendrick’s، 30 مل Campari، 30 مل Sweet Vermouth، يُحرّك مع الثلج (Stirred) ويُقدّم فوق قالب ثلج صافي كبير (Clear Ice Cube).',
      allergensAr: '⚠️ يحتوي على الكبريتات (Sulfites) في الفيرموث.',
      pairingAr: '💡 مشروب مثالي قبل العشاء (Aperitif) أو بجانب أطباق اللحوم المشوية والواغيو.',
      questions: [
        {
          qAr: 'ما هي النسب الصحيحة وطريقة تحضير كوكتيل Smoky Negroni؟',
          qEn: 'What are the ratios and technique for the Smoky Negroni?',
          options: [
            'نسب متساوية (30 مل جين، 30 مل كامباري، 30 مل سويت فيرموث) ويُحرّك Stirred فوق ثلج صافي',
            '50 مل جين مع 100 مل تونيك ويُرجّ بالشاكر Shaken',
            '45 مل ويسكي مع بياض بيض وعصير ليمون',
          ],
          correct: 0,
        },
      ],
    },
  ];

  FOH.academyCatalogData = {
    DEFAULT_ACADEMY_ITEMS,
  };
})(window.FOH = window.FOH || {});

