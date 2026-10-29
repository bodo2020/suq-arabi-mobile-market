-- Final editorial matching rules for genuine ingredient categories.
-- Missing produce stays missing; never substitute snacks/sauces/spice mixes.
update public.smart_shopping_slots s set
 search_terms=array['مكرونة فرن']::text[],required_terms=array['مكرونة فرن']::text[],excluded_terms=array['شوربة','صلصة','خلطة']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='makarona-beshamel' and s.label_ar='مكرونة أقلام';
update public.smart_shopping_slots s set
 search_terms=array['حليب كامل الدسم']::text[],required_terms=array['حليب كامل الدسم']::text[],excluded_terms=array['بالشوكولاتة','بالفراولة','بالموز','نكهة']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='makarona-beshamel' and s.label_ar='لبن';
update public.smart_shopping_slots s set
 search_terms=array['فلفل اسود']::text[],required_terms=array['فلفل اسود']::text[],excluded_terms=array['عسل','صلصة','لانشون']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='makarona-beshamel' and s.label_ar='فلفل أسود';
update public.smart_shopping_slots s set
 search_terms=array['ارز']::text[],required_terms=array['ارز','رز']::text[],excluded_terms=array['خلطة','دقيق','حلوى','شوكولاتة']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-koshary' and s.label_ar='رز';
update public.smart_shopping_slots s set
 search_terms=array['عيش بلدي']::text[],required_terms=array['عيش بلدي']::text[],excluded_terms=array['سوري','كريبزا','فينو','بسكويت']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-hawawshi' and s.label_ar='عيش بلدي';
update public.smart_shopping_slots s set
 search_terms=array['فلفل اخضر']::text[],required_terms=array['فلفل اخضر']::text[],excluded_terms=array['زيتون','بطعم','مقرمشات','معطر']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-hawawshi' and s.label_ar='فلفل أخضر';
update public.smart_shopping_slots s set
 search_terms=array['كزبرة']::text[],required_terms=array['كزبرة']::text[],excluded_terms=array['نكهة','شيبسي']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-molokhia' and s.label_ar='كزبرة ناشفة';
