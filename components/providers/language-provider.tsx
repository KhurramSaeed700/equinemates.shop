"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";

export type LanguageCode = "en" | "de" | "fr" | "es" | "ar" | "ur";

type TranslationKey =
  | "announcement"
  | "appearance"
  | "cart"
  | "currency"
  | "darkMode"
  | "language"
  | "lightMode"
  | "mainNavigation"
  | "noMatchingProducts"
  | "search"
  | "settings"
  | "shopAll"
  | "signIn"
  | "wishlist";

type LanguageOption = {
  code: LanguageCode;
  direction: "ltr" | "rtl";
  label: string;
};

type LanguageContextValue = {
  language: LanguageCode;
  languages: readonly LanguageOption[];
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const LANGUAGE_STORAGE_KEY = "equinemates-language";
const LANGUAGE_CHANGE_EVENT = "equinemates-language-change";

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: "en", direction: "ltr", label: "English" },
  { code: "de", direction: "ltr", label: "Deutsch" },
  { code: "fr", direction: "ltr", label: "Français" },
  { code: "es", direction: "ltr", label: "Español" },
  { code: "ar", direction: "rtl", label: "العربية" },
  { code: "ur", direction: "rtl", label: "اردو" },
];

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    announcement: "Free shipping on orders above 200 USD",
    appearance: "Appearance",
    cart: "Cart",
    currency: "Currency",
    darkMode: "Dark",
    language: "Language",
    lightMode: "Light",
    mainNavigation: "Main navigation",
    noMatchingProducts: "No matching products",
    search: "Search name or SKU",
    settings: "Site settings",
    shopAll: "Shop all",
    signIn: "Sign in",
    wishlist: "Wishlist",
  },
  de: {
    announcement: "Kostenloser Versand ab 200 USD",
    appearance: "Darstellung",
    cart: "Warenkorb",
    currency: "Währung",
    darkMode: "Dunkel",
    language: "Sprache",
    lightMode: "Hell",
    mainNavigation: "Hauptnavigation",
    noMatchingProducts: "Keine passenden Produkte",
    search: "Nach Name oder SKU suchen",
    settings: "Seiteneinstellungen",
    shopAll: "Alle ansehen",
    signIn: "Anmelden",
    wishlist: "Wunschliste",
  },
  fr: {
    announcement: "Livraison gratuite dès 200 USD",
    appearance: "Apparence",
    cart: "Panier",
    currency: "Devise",
    darkMode: "Sombre",
    language: "Langue",
    lightMode: "Clair",
    mainNavigation: "Navigation principale",
    noMatchingProducts: "Aucun produit correspondant",
    search: "Rechercher par nom ou SKU",
    settings: "Paramètres du site",
    shopAll: "Tout voir",
    signIn: "Se connecter",
    wishlist: "Favoris",
  },
  es: {
    announcement: "Envío gratis en pedidos superiores a 200 USD",
    appearance: "Apariencia",
    cart: "Carrito",
    currency: "Moneda",
    darkMode: "Oscuro",
    language: "Idioma",
    lightMode: "Claro",
    mainNavigation: "Navegación principal",
    noMatchingProducts: "No hay productos coincidentes",
    search: "Buscar por nombre o SKU",
    settings: "Configuración del sitio",
    shopAll: "Ver todo",
    signIn: "Iniciar sesión",
    wishlist: "Favoritos",
  },
  ar: {
    announcement: "شحن مجاني للطلبات التي تزيد عن 200 USD",
    appearance: "المظهر",
    cart: "السلة",
    currency: "العملة",
    darkMode: "داكن",
    language: "اللغة",
    lightMode: "فاتح",
    mainNavigation: "التنقل الرئيسي",
    noMatchingProducts: "لا توجد منتجات مطابقة",
    search: "البحث بالاسم أو SKU",
    settings: "إعدادات الموقع",
    shopAll: "عرض الكل",
    signIn: "تسجيل الدخول",
    wishlist: "المفضلة",
  },
  ur: {
    announcement: "200 USD سے زیادہ کے آرڈرز پر مفت ڈیلیوری",
    appearance: "ظاہری شکل",
    cart: "کارٹ",
    currency: "کرنسی",
    darkMode: "ڈارک",
    language: "زبان",
    lightMode: "لائٹ",
    mainNavigation: "مرکزی نیویگیشن",
    noMatchingProducts: "کوئی مماثل پروڈکٹ نہیں",
    search: "نام یا SKU سے تلاش کریں",
    settings: "سائٹ سیٹنگز",
    shopAll: "سب دیکھیں",
    signIn: "سائن ان",
    wishlist: "پسندیدہ",
  },
};

const storefrontPhrases: Record<Exclude<LanguageCode, "en">, Record<string, string>> = {
  de: {
    "About Equinemates": "Über Equinemates",
    "Add to Cart": "In den Warenkorb",
    "Buy Now": "Jetzt kaufen",
    "Add to favorites": "Zu Favoriten hinzufügen",
    "Add to wishlist": "Zur Wunschliste hinzufügen",
    "All Categories": "Alle Kategorien",
    "All options": "Alle Optionen",
    "All products": "Alle Produkte",
    "Availability": "Verfügbarkeit",
    "Bank Transfer": "Banküberweisung",
    "Best Sellers": "Bestseller",
    "Browse catalog categories": "Katalogkategorien durchsuchen",
    "Browse subcategories": "Unterkategorien durchsuchen",
    "Care Instructions": "Pflegehinweise",
    "Care instructions will be provided soon.": "Pflegehinweise folgen in Kürze.",
    "Cart Items": "Artikel im Warenkorb",
    "Catalog Request": "Katalog anfordern",
    "Categories": "Kategorien",
    "Category:": "Kategorie:",
    "Checkout": "Kasse",
    "Choose equipment with confidence": "Ausrüstung sicher auswählen",
    "Clear filters": "Filter löschen",
    "Close preview": "Vorschau schließen",
    "Combined total": "Gesamtsumme",
    "Community feedback": "Kundenmeinungen",
    "Contact Us": "Kontakt",
    "Credit/Debit Card": "Kredit-/Debitkarte",
    "Customer Care": "Kundenservice",
    "Customer Reviews": "Kundenbewertungen",
    "Dark": "Dunkel",
    "Description": "Beschreibung",
    "Digital Wallet": "Digitale Geldbörse",
    "Discover new": "Neuheiten entdecken",
    "Email address": "E-Mail-Adresse",
    "Equinemates buying guide": "Equinemates Kaufratgeber",
    "Explore the collection": "Kollektion entdecken",
    "Featured": "Empfohlen",
    "Filter options": "Filteroptionen",
    "Follow Equinemates": "Equinemates folgen",
    "Frequently Bought Together": "Häufig zusammen gekauft",
    "Help": "Hilfe",
    "In stock": "Auf Lager",
    "In stock, ready to ship": "Auf Lager, versandbereit",
    "Join": "Anmelden",
    "Last Viewed Products": "Zuletzt angesehene Produkte",
    "Latest additions": "Neu hinzugefügt",
    "Light": "Hell",
    "Loading your saved products...": "Gespeicherte Produkte werden geladen...",
    "New": "Neu",
    "New Arrivals": "Neuheiten",
    "No matching products": "Keine passenden Produkte",
    "No options": "Keine Optionen",
    "No products found in this category": "Keine Produkte in dieser Kategorie gefunden",
    "No reviews": "Keine Bewertungen",
    "Newsletter Signup": "Newsletter-Anmeldung",
    "Option": "Option",
    "Our Story": "Unsere Geschichte",
    "Out of stock": "Nicht auf Lager",
    "People Also Bought": "Andere kauften auch",
    "Place Order": "Bestellung aufgeben",
    "Price high to low": "Preis absteigend",
    "Price low to high": "Preis aufsteigend",
    "Privacy Policy": "Datenschutzrichtlinie",
    "Processing...": "Wird verarbeitet...",
    "Product filters": "Produktfilter",
    "Product images": "Produktbilder",
    "Product option": "Produktoption",
    "Product sorting": "Produktsortierung",
    "Products": "Produkte",
    "Quantity": "Menge",
    "Related Products": "Ähnliche Produkte",
    "Remove from favorites": "Aus Favoriten entfernen",
    "Remove from wishlist": "Von der Wunschliste entfernen",
    "Returns & Refunds": "Rückgabe und Erstattung",
    "Sale": "Angebot",
    "Saved Products": "Gespeicherte Produkte",
    "Search name or SKU": "Nach Name oder SKU suchen",
    "See Preview": "Vorschau",
    "See it in action": "Im Einsatz ansehen",
    "Shipping Information": "Versandinformationen",
    "Shipping Policy": "Versandrichtlinie",
    "Shop Collections": "Kollektionen kaufen",
    "Show less": "Weniger anzeigen",
    "Sign in": "Anmelden",
    "Sign me up": "Jetzt anmelden",
    "Sort by": "Sortieren nach",
    "Style:": "Stil:",
    "Terms & Conditions": "Allgemeine Geschäftsbedingungen",
    "Track Your Order": "Bestellung verfolgen",
    "View all": "Alle ansehen",
    "View a product to see it here.": "Öffnen Sie ein Produkt, damit es hier erscheint.",
    "Welcome offer": "Willkommensangebot",
    "Wholesale Inquiry": "Großhandelsanfrage",
    "Wishlist": "Wunschliste",
  },
  fr: {
    "About Equinemates": "À propos d’Equinemates",
    "Add to Cart": "Ajouter au panier",
    "Buy Now": "Acheter maintenant",
    "All Categories": "Toutes les catégories",
    "All options": "Toutes les options",
    "All products": "Tous les produits",
    "Availability": "Disponibilité",
    "Best Sellers": "Meilleures ventes",
    "Care Instructions": "Conseils d’entretien",
    "Cart Items": "Articles du panier",
    "Categories": "Catégories",
    "Checkout": "Paiement",
    "Clear filters": "Effacer les filtres",
    "Contact Us": "Nous contacter",
    "Customer Care": "Service client",
    "Customer Reviews": "Avis clients",
    "Description": "Description",
    "Featured": "En vedette",
    "Filter options": "Options de filtre",
    "In stock": "En stock",
    "Last Viewed Products": "Produits récemment consultés",
    "New": "Nouveau",
    "New Arrivals": "Nouveautés",
    "No options": "Aucune option",
    "No reviews": "Aucun avis",
    "Out of stock": "Rupture de stock",
    "Place Order": "Passer la commande",
    "Price high to low": "Prix décroissant",
    "Price low to high": "Prix croissant",
    "Privacy Policy": "Politique de confidentialité",
    "Product filters": "Filtres de produits",
    "Product images": "Images du produit",
    "Product option": "Option du produit",
    "Products": "Produits",
    "Quantity": "Quantité",
    "Related Products": "Produits associés",
    "Returns & Refunds": "Retours et remboursements",
    "Sale": "Promotion",
    "Saved Products": "Produits enregistrés",
    "Search name or SKU": "Rechercher par nom ou SKU",
    "See Preview": "Voir l’aperçu",
    "Shipping Information": "Informations de livraison",
    "Shipping Policy": "Politique de livraison",
    "Shop Collections": "Voir les collections",
    "Sort by": "Trier par",
    "Terms & Conditions": "Conditions générales",
    "View all": "Tout voir",
    "Wishlist": "Favoris",
  },
  es: {
    "About Equinemates": "Acerca de Equinemates",
    "Add to Cart": "Añadir al carrito",
    "Buy Now": "Comprar ahora",
    "All Categories": "Todas las categorías",
    "All options": "Todas las opciones",
    "All products": "Todos los productos",
    "Availability": "Disponibilidad",
    "Best Sellers": "Más vendidos",
    "Care Instructions": "Instrucciones de cuidado",
    "Cart Items": "Artículos del carrito",
    "Categories": "Categorías",
    "Checkout": "Finalizar compra",
    "Clear filters": "Borrar filtros",
    "Contact Us": "Contáctanos",
    "Customer Care": "Atención al cliente",
    "Customer Reviews": "Opiniones de clientes",
    "Description": "Descripción",
    "Featured": "Destacados",
    "Filter options": "Opciones de filtro",
    "In stock": "En stock",
    "Last Viewed Products": "Productos vistos recientemente",
    "New": "Nuevo",
    "New Arrivals": "Novedades",
    "No options": "Sin opciones",
    "No reviews": "Sin opiniones",
    "Out of stock": "Agotado",
    "Place Order": "Realizar pedido",
    "Price high to low": "Precio: mayor a menor",
    "Price low to high": "Precio: menor a mayor",
    "Privacy Policy": "Política de privacidad",
    "Product filters": "Filtros de productos",
    "Product images": "Imágenes del producto",
    "Product option": "Opción del producto",
    "Products": "Productos",
    "Quantity": "Cantidad",
    "Related Products": "Productos relacionados",
    "Returns & Refunds": "Devoluciones y reembolsos",
    "Sale": "Oferta",
    "Saved Products": "Productos guardados",
    "Search name or SKU": "Buscar por nombre o SKU",
    "See Preview": "Ver vista previa",
    "Shipping Information": "Información de envío",
    "Shipping Policy": "Política de envíos",
    "Shop Collections": "Ver colecciones",
    "Sort by": "Ordenar por",
    "Terms & Conditions": "Términos y condiciones",
    "View all": "Ver todo",
    "Wishlist": "Favoritos",
  },
  ar: {
    "About Equinemates": "عن Equinemates",
    "Add to Cart": "أضف إلى السلة",
    "Buy Now": "اشتر الآن",
    "All Categories": "جميع الفئات",
    "All options": "جميع الخيارات",
    "All products": "جميع المنتجات",
    "Availability": "التوفر",
    "Best Sellers": "الأكثر مبيعًا",
    "Care Instructions": "تعليمات العناية",
    "Cart Items": "عناصر السلة",
    "Categories": "الفئات",
    "Checkout": "إتمام الشراء",
    "Clear filters": "مسح الفلاتر",
    "Contact Us": "اتصل بنا",
    "Customer Care": "خدمة العملاء",
    "Customer Reviews": "آراء العملاء",
    "Description": "الوصف",
    "Featured": "مميز",
    "Filter options": "خيارات التصفية",
    "In stock": "متوفر",
    "Last Viewed Products": "المنتجات التي شوهدت مؤخرًا",
    "New": "جديد",
    "New Arrivals": "وصل حديثًا",
    "No options": "لا توجد خيارات",
    "No reviews": "لا توجد مراجعات",
    "Out of stock": "غير متوفر",
    "Place Order": "إرسال الطلب",
    "Price high to low": "السعر من الأعلى إلى الأقل",
    "Price low to high": "السعر من الأقل إلى الأعلى",
    "Privacy Policy": "سياسة الخصوصية",
    "Product filters": "فلاتر المنتجات",
    "Product images": "صور المنتج",
    "Product option": "خيار المنتج",
    "Products": "المنتجات",
    "Quantity": "الكمية",
    "Related Products": "منتجات ذات صلة",
    "Returns & Refunds": "الإرجاع والاسترداد",
    "Sale": "تخفيض",
    "Saved Products": "المنتجات المحفوظة",
    "Search name or SKU": "البحث بالاسم أو SKU",
    "See Preview": "عرض سريع",
    "Shipping Information": "معلومات الشحن",
    "Shipping Policy": "سياسة الشحن",
    "Shop Collections": "تصفح المجموعات",
    "Sort by": "الترتيب حسب",
    "Terms & Conditions": "الشروط والأحكام",
    "View all": "عرض الكل",
    "Wishlist": "المفضلة",
  },
  ur: {
    "About Equinemates": "Equinemates کے بارے میں",
    "Add to Cart": "کارٹ میں شامل کریں",
    "Buy Now": "ابھی خریدیں",
    "Add to favorites": "پسندیدہ میں شامل کریں",
    "Add to wishlist": "پسندیدہ فہرست میں شامل کریں",
    "All Categories": "تمام زمرے",
    "All options": "تمام اختیارات",
    "All products": "تمام مصنوعات",
    "Availability": "دستیابی",
    "Bank Transfer": "بینک ٹرانسفر",
    "Best Sellers": "سب سے زیادہ فروخت ہونے والی",
    "Browse catalog categories": "کیٹلاگ کے زمرے دیکھیں",
    "Browse subcategories": "ذیلی زمرے دیکھیں",
    "Care Instructions": "دیکھ بھال کی ہدایات",
    "Care instructions will be provided soon.": "دیکھ بھال کی ہدایات جلد فراہم کی جائیں گی۔",
    "Cart Items": "کارٹ کی اشیاء",
    "Catalog Request": "کیٹلاگ کی درخواست",
    "Categories": "زمرے",
    "Category:": "زمرہ:",
    "Checkout": "چیک آؤٹ",
    "Choose equipment with confidence": "اعتماد کے ساتھ سامان منتخب کریں",
    "Clear filters": "فلٹر صاف کریں",
    "Close preview": "پیش منظر بند کریں",
    "Combined total": "کل رقم",
    "Community feedback": "صارفین کی رائے",
    "Contact Us": "ہم سے رابطہ کریں",
    "Credit/Debit Card": "کریڈٹ/ڈیبٹ کارڈ",
    "Customer Care": "کسٹمر سروس",
    "Customer Reviews": "صارفین کے جائزے",
    "Dark": "ڈارک",
    "Description": "تفصیل",
    "Digital Wallet": "ڈیجیٹل والیٹ",
    "Discover new": "نئی مصنوعات دیکھیں",
    "Email address": "ای میل ایڈریس",
    "Equinemates buying guide": "Equinemates خریداری گائیڈ",
    "Explore the collection": "کلیکشن دیکھیں",
    "Featured": "نمایاں",
    "Filter options": "فلٹر کے اختیارات",
    "Follow Equinemates": "Equinemates کو فالو کریں",
    "Frequently Bought Together": "اکثر ایک ساتھ خریدی جانے والی اشیاء",
    "Help": "مدد",
    "In stock": "اسٹاک میں",
    "In stock, ready to ship": "اسٹاک میں، ترسیل کے لیے تیار",
    "Join": "شامل ہوں",
    "Last Viewed Products": "آخری دیکھی گئی مصنوعات",
    "Latest additions": "تازہ ترین مصنوعات",
    "Light": "لائٹ",
    "Loading your saved products...": "محفوظ مصنوعات لوڈ ہو رہی ہیں...",
    "New": "نیا",
    "New Arrivals": "نئی آمد",
    "No matching products": "کوئی مماثل پروڈکٹ نہیں",
    "No options": "کوئی اختیار نہیں",
    "No products found in this category": "اس زمرے میں کوئی پروڈکٹ نہیں ملی",
    "No reviews": "کوئی جائزہ نہیں",
    "Newsletter Signup": "نیوز لیٹر سائن اپ",
    "Option": "اختیار",
    "Our Story": "ہماری کہانی",
    "Out of stock": "اسٹاک ختم",
    "People Also Bought": "لوگوں نے یہ بھی خریدا",
    "Place Order": "آرڈر دیں",
    "Price high to low": "قیمت زیادہ سے کم",
    "Price low to high": "قیمت کم سے زیادہ",
    "Privacy Policy": "رازداری کی پالیسی",
    "Processing...": "عمل جاری ہے...",
    "Product filters": "پروڈکٹ فلٹرز",
    "Product images": "پروڈکٹ تصاویر",
    "Product option": "پروڈکٹ اختیار",
    "Product sorting": "پروڈکٹ ترتیب",
    "Products": "مصنوعات",
    "Quantity": "تعداد",
    "Related Products": "متعلقہ مصنوعات",
    "Remove from favorites": "پسندیدہ سے ہٹائیں",
    "Remove from wishlist": "پسندیدہ فہرست سے ہٹائیں",
    "Returns & Refunds": "واپسی اور رقم کی واپسی",
    "Sale": "سیل",
    "Saved Products": "محفوظ مصنوعات",
    "Search name or SKU": "نام یا SKU سے تلاش کریں",
    "See Preview": "پیش منظر دیکھیں",
    "See it in action": "استعمال میں دیکھیں",
    "Shipping Information": "ترسیل کی معلومات",
    "Shipping Policy": "ترسیل کی پالیسی",
    "Shop Collections": "کلیکشن خریدیں",
    "Show less": "کم دکھائیں",
    "Sign in": "سائن ان",
    "Sign me up": "مجھے شامل کریں",
    "Sort by": "ترتیب دیں",
    "Style:": "انداز:",
    "Terms & Conditions": "شرائط و ضوابط",
    "Track Your Order": "اپنا آرڈر ٹریک کریں",
    "View all": "سب دیکھیں",
    "View a product to see it here.": "یہاں دکھانے کے لیے کوئی پروڈکٹ دیکھیں۔",
    "Welcome offer": "خوش آمدیدی پیشکش",
    "Wholesale Inquiry": "تھوک خریداری کی درخواست",
    "Wishlist": "پسندیدہ فہرست",
  },
};

const supplementalStorefrontPhrases: Partial<
  Record<Exclude<LanguageCode, "en">, Record<string, string>>
> = {
  de: {
    "Built for performance": "Für Leistung entwickelt",
    "Can I compare prices in another currency?": "Kann ich Preise in einer anderen Währung vergleichen?",
    "Choose equipment with confidence": "Ausrüstung sicher auswählen",
    "Compare dependable products, available variations, live stock, and pricing in one place.": "Vergleichen Sie zuverlässige Produkte, verfügbare Varianten, Lagerbestand und Preise an einem Ort.",
    "Discover category-focused collections with responsive ordering, account tools, and wholesale-ready operations.": "Entdecken Sie ausgewählte Kollektionen mit einfacher Bestellung, Kontofunktionen und Großhandelsservice.",
    "Filter by available product options, then open the listing to review every size, finish, or configuration.": "Filtern Sie nach verfügbaren Optionen und öffnen Sie das Angebot, um Größen, Ausführungen und Konfigurationen zu prüfen.",
    "Fresh inventory added for weekly demand and upcoming events.": "Neue Bestände für den wöchentlichen Bedarf und kommende Veranstaltungen.",
    "Horse Products": "Produkte für Pferde",
    "How can I tell whether an item is available?": "Wie erkenne ich, ob ein Artikel verfügbar ist?",
    "How do I find the right product variation?": "Wie finde ich die richtige Produktvariante?",
    "Our most purchased lines across stables, riders, and households.": "Unsere meistgekauften Produkte für Stall, Reiter und Haushalt.",
    "Premium equestrian, rider, and pet essentials.": "Premiumprodukte für Pferde, Reiter und Haustiere.",
    "Purpose-built essentials for horses, riders, pets, and stables.": "Zweckmäßige Ausstattung für Pferde, Reiter, Haustiere und Ställe.",
    "Rider Products": "Produkte für Reiter",
    "Shop Collection": "Kollektion kaufen",
    "Shop Horse Range": "Pferdesortiment kaufen",
    "Shop Rider Range": "Reitersortiment kaufen",
    "Sign up for product launches, promotions, and stable supply updates.": "Erhalten Sie Neuigkeiten zu Produkten, Aktionen und Stallbedarf.",
    "Stable season essentials": "Grundausstattung für die Stallsaison",
    "This season's rider favourites": "Reiterfavoriten dieser Saison",
    "Use category and product-option filters to narrow the catalog, then compare stock, variation, rating, and pricing details before opening a listing.": "Grenzen Sie den Katalog mit Kategorie- und Optionsfiltern ein und vergleichen Sie Bestand, Varianten, Bewertungen und Preise.",
    "Use the availability filter to show products that are currently in stock or review out-of-stock listings separately.": "Zeigen Sie mit dem Verfügbarkeitsfilter lagernde Produkte an oder prüfen Sie nicht verfügbare Angebote separat.",
    "Use the settings icon in the header to switch currency; displayed catalog prices update automatically.": "Wechseln Sie die Währung über das Einstellungssymbol; die angezeigten Preise werden automatisch aktualisiert.",
    "Wholesale Quote": "Großhandelsangebot",
  },
  ur: {
    "Built for performance": "بہترین کارکردگی کے لیے تیار",
    "Can I compare prices in another currency?": "کیا میں دوسری کرنسی میں قیمتوں کا موازنہ کر سکتا ہوں؟",
    "Choose equipment with confidence": "اعتماد کے ساتھ سامان منتخب کریں",
    "Compare dependable products, available variations, live stock, and pricing in one place.": "قابل اعتماد مصنوعات، دستیاب اقسام، موجودہ اسٹاک اور قیمتیں ایک جگہ موازنہ کریں۔",
    "Discover category-focused collections with responsive ordering, account tools, and wholesale-ready operations.": "آسان آرڈرنگ، اکاؤنٹ سہولیات اور تھوک خریداری کے ساتھ منتخب کلیکشن دریافت کریں۔",
    "Filter by available product options, then open the listing to review every size, finish, or configuration.": "دستیاب آپشنز کے مطابق فلٹر کریں، پھر ہر سائز، فنش یا ترتیب دیکھنے کے لیے لسٹنگ کھولیں۔",
    "Fresh inventory added for weekly demand and upcoming events.": "ہفتہ وار ضرورت اور آنے والے پروگراموں کے لیے نیا اسٹاک۔",
    "Horse Products": "گھوڑوں کی مصنوعات",
    "How can I tell whether an item is available?": "میں کیسے جانوں کہ کوئی چیز دستیاب ہے؟",
    "How do I find the right product variation?": "میں درست پروڈکٹ آپشن کیسے تلاش کروں؟",
    "Our most purchased lines across stables, riders, and households.": "اصطبل، سواروں اور گھروں کے لیے ہماری مقبول ترین مصنوعات۔",
    "Premium equestrian, rider, and pet essentials.": "گھوڑوں، سواروں اور پالتو جانوروں کے لیے معیاری ضروریات۔",
    "Purpose-built essentials for horses, riders, pets, and stables.": "گھوڑوں، سواروں، پالتو جانوروں اور اصطبل کے لیے خاص ضروریات۔",
    "Rider Products": "سواروں کی مصنوعات",
    "Shop Collection": "کلیکشن خریدیں",
    "Shop Horse Range": "گھوڑوں کی مصنوعات خریدیں",
    "Shop Rider Range": "سواروں کی مصنوعات خریدیں",
    "Sign up for product launches, promotions, and stable supply updates.": "نئی مصنوعات، رعایتوں اور اصطبل کی سپلائی کی خبروں کے لیے سائن اپ کریں۔",
    "Stable season essentials": "اصطبل کے موسم کی ضروریات",
    "This season's rider favourites": "اس موسم میں سواروں کی پسند",
    "Use category and product-option filters to narrow the catalog, then compare stock, variation, rating, and pricing details before opening a listing.": "کیٹلاگ محدود کرنے کے لیے زمرہ اور آپشن فلٹر استعمال کریں، پھر اسٹاک، اقسام، ریٹنگ اور قیمت کا موازنہ کریں۔",
    "Use the availability filter to show products that are currently in stock or review out-of-stock listings separately.": "اسٹاک میں موجود مصنوعات دکھانے یا ختم شدہ مصنوعات الگ دیکھنے کے لیے دستیابی فلٹر استعمال کریں۔",
    "Use the settings icon in the header to switch currency; displayed catalog prices update automatically.": "کرنسی تبدیل کرنے کے لیے ہیڈر میں سیٹنگز آئیکن استعمال کریں؛ قیمتیں خودکار طور پر اپ ڈیٹ ہوں گی۔",
    "Wholesale Quote": "تھوک قیمت حاصل کریں",
  },
};

const pagePhrases: Record<Exclude<LanguageCode, "en">, Record<string, string>> = {
  de: {
    "Health & Care": "Gesundheit & Pflege",
    Horse: "Pferd",
    Pet: "Haustier",
    Rider: "Reiter",
    Stable: "Stall",
    "Image coming soon.": "Bild folgt in Kürze.",
    From: "Ab",
    Was: "Statt",
    Added: "Hinzugefügt",
    "Admin Panel": "Adminbereich",
    "Super Admin": "Super-Admin",
    "Wholesale Dashboard": "Großhandelsportal",
    "All rights reserved.": "Alle Rechte vorbehalten.",
    Accessibility: "Barrierefreiheit",
  },
  fr: {
    "Health & Care": "Santé et soins",
    Horse: "Cheval",
    Pet: "Animaux",
    Rider: "Cavalier",
    Stable: "Écurie",
    "Built for performance": "Conçu pour la performance",
    "Premium equestrian, rider, and pet essentials.": "Équipement haut de gamme pour chevaux, cavaliers et animaux.",
    "Discover category-focused collections with responsive ordering, account tools, and wholesale-ready operations.": "Découvrez des collections spécialisées, des commandes simples, des outils de compte et des services de gros.",
    "Shop Collection": "Voir la collection",
    "Wholesale Quote": "Devis professionnel",
    "Horse Products": "Produits pour chevaux",
    "Stable season essentials": "Les essentiels de l’écurie",
    "Shop Horse Range": "Voir la gamme cheval",
    "Rider Products": "Produits pour cavaliers",
    "This season's rider favourites": "Les favoris des cavaliers cette saison",
    "Shop Rider Range": "Voir la gamme cavalier",
    "Best Sellers": "Meilleures ventes",
    "Explore the collection": "Explorer la collection",
    "Our most purchased lines across stables, riders, and households.": "Nos gammes les plus appréciées des écuries, cavaliers et foyers.",
    "New Arrivals": "Nouveautés",
    "Latest additions": "Derniers ajouts",
    "Fresh inventory added for weekly demand and upcoming events.": "De nouveaux produits pour les besoins de la semaine et les événements à venir.",
    "Discover new": "Découvrir les nouveautés",
    "Image coming soon.": "Image bientôt disponible.",
    From: "À partir de",
    Was: "Avant",
    Added: "Ajouté",
    "Follow Equinemates": "Suivre Equinemates",
    Help: "Aide",
    "Track Your Order": "Suivre votre commande",
    "Catalog Request": "Demande de catalogue",
    "Wholesale Inquiry": "Demande professionnelle",
    "Our Story": "Notre histoire",
    "Wholesale Dashboard": "Espace professionnel",
    "Sign up for product launches, promotions, and stable supply updates.": "Inscrivez-vous pour recevoir les nouveautés, promotions et actualités de l’écurie.",
    "Email address": "Adresse e-mail",
    Join: "S’inscrire",
    "All rights reserved.": "Tous droits réservés.",
    Accessibility: "Accessibilité",
    "Grooming & Bathing": "Toilettage et bain",
    Clippers: "Tondeuses",
    "Balling Guns": "Pistolets lance-bolus",
    "Stainless Balling Guns": "Pistolets lance-bolus en acier inoxydable",
    "Plastic Balling Guns": "Pistolets lance-bolus en plastique",
    "Castration Instruments": "Instruments de castration",
    "Burdizzo Castrators": "Pinces Burdizzo",
    "Castration Forceps": "Pinces de castration",
    Emasculators: "Émasculateurs",
    "Ear Tagging Instruments": "Instruments de marquage auriculaire",
    "Ear Tag Applicators": "Pinces de pose de boucles auriculaires",
    "Ear Tag Removal Tools": "Outils de retrait des boucles auriculaires",
    "Hoof & Claw Tools": "Outils pour sabots et onglons",
    "Claw Cutters": "Coupe-onglons",
    "Hoof Knives (Vet Grade)": "Rénettes vétérinaires",
    "Hoof Testers": "Pinces exploratrices pour sabots",
    Dehorners: "Écorneurs",
    Forceps: "Pinces",
    "Needle Holders": "Porte-aiguilles",
    "Surgical Scissors": "Ciseaux chirurgicaux",
    "Wire Saws": "Scies-fil",
    "Milking Equipment": "Matériel de traite",
    "Uterine Pumps": "Pompes utérines",
    "Obstetric Instruments": "Instruments obstétricaux",
    "OB Chains": "Chaînes obstétricales",
    "OB Handles": "Poignées obstétricales",
    "OB Hooks": "Crochets obstétricaux",
    "Pig Holders": "Dispositifs de contention pour porcs",
    "Grooming Products (Livestock)": "Produits de toilettage pour bétail",
    "Bull Holders": "Pinces de contention pour taureaux",
    "Nose Tongs": "Pinces nasales",
  },
  es: {
    "Health & Care": "Salud y cuidados",
    Horse: "Caballo",
    Pet: "Mascotas",
    Rider: "Jinete",
    Stable: "Establo",
    "Built for performance": "Diseñado para rendir",
    "Premium equestrian, rider, and pet essentials.": "Artículos prémium para caballos, jinetes y mascotas.",
    "Discover category-focused collections with responsive ordering, account tools, and wholesale-ready operations.": "Descubre colecciones especializadas, pedidos sencillos, herramientas de cuenta y servicios mayoristas.",
    "Shop Collection": "Ver colección",
    "Wholesale Quote": "Cotización mayorista",
    "Horse Products": "Productos para caballos",
    "Stable season essentials": "Esenciales para el establo",
    "Shop Horse Range": "Ver gama para caballos",
    "Rider Products": "Productos para jinetes",
    "This season's rider favourites": "Favoritos del jinete esta temporada",
    "Shop Rider Range": "Ver gama para jinetes",
    "Explore the collection": "Explora la colección",
    "Our most purchased lines across stables, riders, and households.": "Nuestras líneas más compradas por establos, jinetes y hogares.",
    "Latest additions": "Últimas novedades",
    "Fresh inventory added for weekly demand and upcoming events.": "Nuevo inventario para la demanda semanal y próximos eventos.",
    "Discover new": "Descubrir novedades",
    "Image coming soon.": "Imagen disponible próximamente.",
    From: "Desde",
    Was: "Antes",
    Added: "Añadido",
    "Follow Equinemates": "Sigue a Equinemates",
    Help: "Ayuda",
    "Track Your Order": "Seguir tu pedido",
    "Catalog Request": "Solicitar catálogo",
    "Wholesale Inquiry": "Consulta mayorista",
    "Our Story": "Nuestra historia",
    "Wholesale Dashboard": "Panel mayorista",
    "Sign up for product launches, promotions, and stable supply updates.": "Suscríbete para recibir novedades, promociones y noticias del establo.",
    "Email address": "Correo electrónico",
    Join: "Suscribirse",
    "All rights reserved.": "Todos los derechos reservados.",
    Accessibility: "Accesibilidad",
  },
  ar: {
    "Health & Care": "الصحة والعناية",
    Horse: "الخيل",
    Pet: "الحيوانات الأليفة",
    Rider: "الفارس",
    Stable: "الإسطبل",
    "Built for performance": "مصمم للأداء",
    "Premium equestrian, rider, and pet essentials.": "مستلزمات فاخرة للخيل والفرسان والحيوانات الأليفة.",
    "Discover category-focused collections with responsive ordering, account tools, and wholesale-ready operations.": "اكتشف مجموعات متخصصة وطلبًا سهلًا وأدوات للحساب وخدمات جاهزة للبيع بالجملة.",
    "Shop Collection": "تصفح المجموعة",
    "Wholesale Quote": "عرض سعر بالجملة",
    "Horse Products": "منتجات الخيل",
    "Stable season essentials": "أساسيات موسم الإسطبل",
    "Shop Horse Range": "تصفح مجموعة الخيل",
    "Rider Products": "منتجات الفرسان",
    "This season's rider favourites": "مختارات الفرسان لهذا الموسم",
    "Shop Rider Range": "تصفح مجموعة الفرسان",
    "Explore the collection": "استكشف المجموعة",
    "Our most purchased lines across stables, riders, and households.": "أكثر مجموعاتنا شراءً لدى الإسطبلات والفرسان والمنازل.",
    "Latest additions": "أحدث الإضافات",
    "Fresh inventory added for weekly demand and upcoming events.": "مخزون جديد للاحتياجات الأسبوعية والفعاليات القادمة.",
    "Discover new": "اكتشف الجديد",
    "Image coming soon.": "الصورة قادمة قريبًا.",
    From: "ابتداءً من",
    Was: "كان",
    Added: "تمت الإضافة",
    "Follow Equinemates": "تابع Equinemates",
    Help: "المساعدة",
    "Track Your Order": "تتبع طلبك",
    "Catalog Request": "طلب الكتالوج",
    "Wholesale Inquiry": "استفسار البيع بالجملة",
    "Our Story": "قصتنا",
    "Wholesale Dashboard": "لوحة البيع بالجملة",
    "Sign up for product launches, promotions, and stable supply updates.": "اشترك لتصلك المنتجات الجديدة والعروض وتحديثات مستلزمات الإسطبل.",
    "Email address": "البريد الإلكتروني",
    Join: "اشترك",
    "All rights reserved.": "جميع الحقوق محفوظة.",
    Accessibility: "إمكانية الوصول",
  },
  ur: {
    "Health & Care": "صحت اور دیکھ بھال",
    Horse: "گھوڑا",
    Pet: "پالتو جانور",
    Rider: "سوار",
    Stable: "اصطبل",
    "Image coming soon.": "تصویر جلد آ رہی ہے۔",
    From: "سے",
    Was: "پہلے",
    Added: "شامل ہو گیا",
    "Admin Panel": "ایڈمن پینل",
    "Super Admin": "سپر ایڈمن",
    "Wholesale Dashboard": "تھوک ڈیش بورڈ",
    "All rights reserved.": "تمام حقوق محفوظ ہیں۔",
    Accessibility: "رسائی",
  },
};

const catalogTerms: Record<Exclude<LanguageCode, "en">, Array<[string, string]>> = {
  de: [["Animal Restraining Tools", "Tierfixiergeräte"], ["Bandage Scissors", "Verbandscheren"], ["Bell Boots", "Hufglocken"], ["Bitless Bridles", "Gebisslose Trensen"], ["Horse Boots & Leg Protection", "Huf- und Beinschutz"], ["Restraining Equipment", "Fixierausrüstung"], ["MISC Veterinary", "Weitere Veterinärprodukte"], ["Copper Roller", "Kupferrolle"], ["Horse Bit", "Pferdegebiss"], ["Snaffle", "Trense"], ["Heritage", "Tradition"], ["Performance", "Leistung"], ["Premier", "Premium"], ["Edition", "Ausführung"], ["Series", "Serie"], ["Collection", "Kollektion"]],
  fr: [["Animal Restraining Tools", "Matériel de contention animale"], ["Bandage Scissors", "Ciseaux à bandage"], ["Bell Boots", "Cloches"], ["Bitless Bridles", "Bridons sans mors"], ["Horse Boots & Leg Protection", "Guêtres et protections des membres"], ["Restraining Equipment", "Matériel de contention"], ["MISC Veterinary", "Matériel vétérinaire divers"], ["Copper Roller", "Rouleau en cuivre"], ["Horse Bit", "Mors pour cheval"], ["Snaffle", "Filet"], ["Heritage", "Tradition"], ["Performance", "Performance"], ["Premier", "Premium"], ["Edition", "Édition"], ["Series", "Série"], ["Collection", "Collection"]],
  es: [["Animal Restraining Tools", "Herramientas de sujeción animal"], ["Bandage Scissors", "Tijeras para vendajes"], ["Bell Boots", "Campanas protectoras"], ["Bitless Bridles", "Bridas sin bocado"], ["Horse Boots & Leg Protection", "Botas y protección de patas"], ["Restraining Equipment", "Equipo de sujeción"], ["MISC Veterinary", "Material veterinario diverso"], ["Copper Roller", "Rodillo de cobre"], ["Horse Bit", "Bocado para caballo"], ["Snaffle", "Filete"], ["Heritage", "Clásico"], ["Performance", "Rendimiento"], ["Premier", "Prémium"], ["Edition", "Edición"], ["Series", "Serie"], ["Collection", "Colección"]],
  ar: [["Animal Restraining Tools", "أدوات تقييد الحيوانات"], ["Bandage Scissors", "مقص الضمادات"], ["Bell Boots", "واقيات الحافر"], ["Bitless Bridles", "لجام بدون شكيمة"], ["Horse Boots & Leg Protection", "أحذية الخيل وحماية الأرجل"], ["Restraining Equipment", "معدات التقييد"], ["MISC Veterinary", "معدات بيطرية متنوعة"], ["Copper Roller", "بكرة نحاسية"], ["Horse Bit", "شكيمة خيل"], ["Snaffle", "شكيمة بسيطة"], ["Heritage", "تراث"], ["Performance", "أداء"], ["Premier", "فاخر"], ["Edition", "إصدار"], ["Series", "سلسلة"], ["Collection", "مجموعة"]],
  ur: [["Animal Restraining Tools", "جانور قابو کرنے کے اوزار"], ["Bandage Scissors", "پٹی کی قینچی"], ["Bell Boots", "بیل بوٹس"], ["Bitless Bridles", "بغیر بٹ کی لگام"], ["Horse Boots & Leg Protection", "گھوڑے کے بوٹ اور ٹانگوں کا تحفظ"], ["Restraining Equipment", "قابو کرنے کا سامان"], ["MISC Veterinary", "متفرق ویٹرنری سامان"], ["Copper Roller", "تانبے کا رولر"], ["Horse Bit", "گھوڑے کا بٹ"], ["Snaffle", "سنیفل"], ["Heritage", "روایتی"], ["Performance", "کارکردگی"], ["Premier", "پریمیم"], ["Edition", "ایڈیشن"], ["Series", "سیریز"], ["Collection", "کلیکشن"]],
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const originalText = new WeakMap<Text, string>();
const lastTranslatedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "placeholder", "title"] as const;
const SKIPPED_TRANSLATION_TAGS = new Set([
  "CODE",
  "NOSCRIPT",
  "PRE",
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
]);

function isLanguageCode(value: string | null): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguageCode(storedLanguage) ? storedLanguage : "en";
}

function subscribeToLanguage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
  };
}

function applyDocumentLanguage(language: LanguageCode) {
  const option = SUPPORTED_LANGUAGES.find((item) => item.code === language);
  document.documentElement.lang = language;
  document.documentElement.dir = option?.direction ?? "ltr";
}

function translateDynamicPhrase(text: string, language: Exclude<LanguageCode, "en">) {
  const dynamicTranslations = {
    de: { results: "Ergebnisse", of: "von", save: "sparen", stock: "auf Lager" },
    fr: { results: "résultats", of: "sur", save: "d’économie", stock: "en stock" },
    es: { results: "resultados", of: "de", save: "de ahorro", stock: "en stock" },
    ar: { results: "نتيجة", of: "من", save: "خصم", stock: "متوفر" },
    ur: { results: "نتائج", of: "میں سے", save: "بچت", stock: "اسٹاک میں" },
  } as const;
  const words = dynamicTranslations[language];
  const resultMatch = text.match(/^(\d+) results$/);
  if (resultMatch) {
    return `${resultMatch[1]} ${words.results}`;
  }

  const showingMatch = text.match(/^(\d+)-(\d+) of (\d+)$/);
  if (showingMatch) {
    return `${showingMatch[1]}-${showingMatch[2]} ${words.of} ${showingMatch[3]}`;
  }

  const saveMatch = text.match(/^Save (\d+)%$/);
  if (saveMatch) {
    return `${saveMatch[1]}% ${words.save}`;
  }

  const stockMatch = text.match(/^(\d+) in stock$/);
  if (stockMatch) {
    return `${stockMatch[1]} ${words.stock}`;
  }

  const copyrightMatch = text.match(/^(\d{4} Equinemates\.) All rights reserved\.$/);
  if (copyrightMatch) {
    return `${copyrightMatch[1]} ${pagePhrases[language]["All rights reserved."]}`;
  }

  const generatedDescription = text.match(
    /^(.+) engineered for dependable daily use in (.+) workflows\. Built with premium materials to balance durability, comfort, and clean finish\.$/,
  );
  if (generatedDescription) {
    const subject = translateCatalogTerms(generatedDescription[1], language);
    const section = translateCatalogTerms(generatedDescription[2], language);
    const templates = {
      de: `${subject} für den zuverlässigen täglichen Einsatz in ${section}. Aus hochwertigen Materialien für Haltbarkeit, Komfort und ein sauberes Finish.`,
      fr: `${subject}, conçu pour une utilisation quotidienne fiable dans ${section}. Fabriqué avec des matériaux haut de gamme pour allier durabilité, confort et finition soignée.`,
      es: `${subject}, diseñado para un uso diario fiable en ${section}. Fabricado con materiales prémium para equilibrar durabilidad, comodidad y un acabado limpio.`,
      ar: `${subject} مصمم للاستخدام اليومي الموثوق في ${section}. مصنوع من مواد فاخرة تجمع بين المتانة والراحة والتشطيب الأنيق.`,
      ur: `${subject}، ${section} میں قابل اعتماد روزمرہ استعمال کے لیے تیار کیا گیا ہے۔ پائیداری، آرام اور عمدہ فنش کے لیے معیاری مواد سے بنایا گیا ہے۔`,
    } as const;
    return templates[language];
  }

  const modernDescription = text.match(
    /^A modern (.+) solution designed for performance and control\. Crafted for riders and caretakers who expect consistent quality in every session\.$/,
  );
  if (modernDescription) {
    const subject = translateCatalogTerms(modernDescription[1], language);
    const templates = {
      de: `Eine moderne ${subject}-Lösung für Leistung und Kontrolle. Für Reiter und Pfleger, die bei jedem Einsatz gleichbleibende Qualität erwarten.`,
      fr: `Une solution moderne de ${subject}, conçue pour la performance et le contrôle. Destinée aux cavaliers et soigneurs qui exigent une qualité constante à chaque utilisation.`,
      es: `Una solución moderna de ${subject}, diseñada para ofrecer rendimiento y control. Creada para jinetes y cuidadores que exigen una calidad constante en cada uso.`,
      ar: `حل حديث من ${subject} مصمم للأداء والتحكم. صُنع للفرسان ومقدمي الرعاية الذين يتوقعون جودة ثابتة في كل استخدام.`,
      ur: `جدید ${subject} حل جو کارکردگی اور کنٹرول کے لیے بنایا گیا ہے۔ ان سواروں اور نگہداشت کرنے والوں کے لیے جو ہر استعمال میں یکساں معیار چاہتے ہیں۔`,
    } as const;
    return templates[language];
  }

  const professionalDescription = text.match(
    /^Professional-grade (.+) tailored for long-term reliability\. Optimized construction supports fit, function, and polished presentation\.$/,
  );
  if (professionalDescription) {
    const subject = translateCatalogTerms(professionalDescription[1], language);
    const templates = {
      de: `${subject} in Profiqualität für langfristige Zuverlässigkeit. Die optimierte Konstruktion unterstützt Passform, Funktion und ein gepflegtes Erscheinungsbild.`,
      fr: `${subject} de qualité professionnelle, conçu pour une fiabilité durable. Sa construction optimisée favorise l’ajustement, la fonctionnalité et une présentation soignée.`,
      es: `${subject} de calidad profesional, creado para una fiabilidad duradera. Su construcción optimizada favorece el ajuste, la función y una presentación impecable.`,
      ar: `${subject} بجودة احترافية وموثوقية طويلة الأمد. يدعم التصميم المحسن الملاءمة والوظيفة والمظهر الأنيق.`,
      ur: `پیشہ ورانہ معیار کا ${subject} جو طویل مدتی بھروسے کے لیے تیار کیا گیا ہے۔ بہتر ساخت موزوں فٹ، کارکردگی اور نفیس پیشکش فراہم کرتی ہے۔`,
    } as const;
    return templates[language];
  }

  return translateCatalogTerms(text, language);
}

function translateCatalogTerms(
  text: string,
  language: Exclude<LanguageCode, "en">,
) {
  return catalogTerms[language].reduce(
    (translated, [source, replacement]) =>
      translated.replace(new RegExp(source, "gi"), replacement),
    text,
  );
}

function translatePhrase(text: string, language: LanguageCode) {
  if (language === "en") {
    return text;
  }

  return (
    storefrontPhrases[language][text] ??
    supplementalStorefrontPhrases[language]?.[text] ??
    pagePhrases[language][text] ??
    translateDynamicPhrase(text, language)
  );
}

function translateTextNode(node: Text, language: LanguageCode) {
  const parent = node.parentElement;
  if (
    !parent ||
    SKIPPED_TRANSLATION_TAGS.has(parent.tagName) ||
    parent.closest("[data-no-translate]")
  ) {
    return;
  }

  const previousTranslation = lastTranslatedText.get(node);
  if (!originalText.has(node) || (previousTranslation && node.data !== previousTranslation)) {
    originalText.set(node, node.data);
  }

  const source = originalText.get(node) ?? node.data;
  const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match || !match[2]) {
    return;
  }

  const translated = `${match[1]}${translatePhrase(match[2], language)}${match[3]}`;
  lastTranslatedText.set(node, translated);
  if (node.data !== translated) {
    node.data = translated;
  }
}

function translateElementAttributes(element: Element, language: LanguageCode) {
  let originals = originalAttributes.get(element);
  if (!originals) {
    originals = new Map<string, string>();
    originalAttributes.set(element, originals);
  }

  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (!current) {
      continue;
    }

    if (!originals.has(attribute)) {
      originals.set(attribute, current);
    }

    const source = originals.get(attribute) ?? current;
    const translated = translatePhrase(source, language);
    if (current !== translated) {
      element.setAttribute(attribute, translated);
    }
  }
}

function translateSubtree(root: Node, language: LanguageCode) {
  if (root instanceof Text) {
    translateTextNode(root, language);
    return;
  }

  if (!(root instanceof Element)) {
    return;
  }

  translateElementAttributes(root, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text, language);
    current = walker.nextNode();
  }

  root.querySelectorAll("[aria-label], [placeholder], [title]").forEach((element) =>
    translateElementAttributes(element, language),
  );
}

function StorefrontTranslationSync({ language }: { language: LanguageCode }) {
  useEffect(() => {
    applyDocumentLanguage(language);
    translateSubtree(document.body, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, language);
          continue;
        }

        if (mutation.type === "attributes") {
          translateElementAttributes(mutation.target as Element, language);
          continue;
        }

        mutation.addedNodes.forEach((node) => translateSubtree(node, language));
      }
    });

    observer.observe(document.body, {
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const storedLanguage = useSyncExternalStore(
    subscribeToLanguage,
    getStoredLanguage,
    () => "en" as LanguageCode,
  );
  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/super-admin" ||
    pathname.startsWith("/super-admin/");
  const language: LanguageCode = isAdminRoute ? "en" : storedLanguage;

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    applyDocumentLanguage(nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languages: SUPPORTED_LANGUAGES,
      setLanguage,
      t: (key) => translations[language][key],
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      <StorefrontTranslationSync language={language} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return context;
}
