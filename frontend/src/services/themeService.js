/* eslint-disable */
// LocalStorage-based B2C theme service

const DEFAULT_THEMES = [
  {
    id: 1,
    name: "Default Crimson",
    primaryColor: "#dc1e26",
    primaryStrongColor: "#b8141b",
    pageBgColor: "#F3F4F6",
    surfaceColor: "#ffffff",
    textColor: "#162126",
    borderColor: "#E5E7EB",
    isActive: true
  },
  {
    id: 2,
    name: "Ocean breeze",
    primaryColor: "#0284c7",
    primaryStrongColor: "#0369a1",
    pageBgColor: "#f0f9ff",
    surfaceColor: "#ffffff",
    textColor: "#0f172a",
    borderColor: "#e2e8f0",
    isActive: false
  }
];

const DEFAULT_LAYOUT = {
  header: {
    headerName: "Modern Header",
    headerWidth: "Full Width",
    isActive: true,
    enableTopBar: false,
    phone: "+91 9876543210",
    email: "info@picknbook.com",
    address: "123, Travel Street, New York, USA",
    showSocialIcons: true,
    showSeparator: true,
    openLinksInNewTab: true,
    socialLinks: [
      { id: "fb", platform: "Facebook", url: "https://facebook.com" },
      { id: "ig", platform: "Instagram", url: "https://instagram.com" },
      { id: "tw", platform: "Twitter", url: "https://twitter.com" },
      { id: "ln", platform: "LinkedIn", url: "https://linkedin.com" },
      { id: "yt", platform: "YouTube", url: "https://youtube.com" }
    ],
    enableMenu: true,
    stickyMenu: true,
    showSearch: true,
    showWishlist: true,
    showCart: true,
    showLoginRegister: true,
    showLanguageSwitcher: true,
    showCurrencySwitcher: false,
  },
  footer: {
    id: "modern-dark",
    name: "Modern Dark Footer",
    enableTopFooter: true,
    aboutUsText: "We make travel planning easier, and booking smarter.",
    phone: "+91 9876543210",
    email: "info@picknbook.com",
    address: "123, Travel Street, New York, USA",
    socialLinks: [
      { id: "fb", platform: "Facebook", url: "https://facebook.com" },
      { id: "ig", platform: "Instagram", url: "https://instagram.com" },
      { id: "tw", platform: "Twitter", url: "https://twitter.com" }
    ]
  }
};

const DEFAULT_HOME_THEME = {
  sections: [
    { id: "hero", title: "Hero Banner", desc: "Main slider banner with search form", icon: "🌅", enabled: true },
    { id: "features", title: "Feature Cards", desc: "Key travel value propositions", icon: "🛡️", enabled: true },
    { id: "offers", title: "Promotions & Offers", desc: "List of active flight and hotel deals", icon: "🏷️", enabled: true },
    { id: "destinations", title: "Popular Destinations", desc: "Curated city recommendations", icon: "✈️", enabled: true },
  ]
};

function getStored(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

// 1. getThemes
export async function getThemes() {
  return getStored("b2c_themes", DEFAULT_THEMES);
}

// 2. createTheme
export async function createTheme(theme) {
  const themes = await getThemes();
  const newTheme = {
    ...theme,
    id: themes.length > 0 ? Math.max(...themes.map((t) => t.id)) + 1 : 1,
    isActive: false
  };
  themes.push(newTheme);
  setStored("b2c_themes", themes);
  return newTheme;
}

// 3. activateTheme
export async function activateTheme(id) {
  const themes = await getThemes();
  const updatedThemes = themes.map((t) => ({
    ...t,
    isActive: t.id === Number(id)
  }));
  setStored("b2c_themes", updatedThemes);
  const active = updatedThemes.find((t) => t.isActive);
  if (active) {
    // Inject active theme colors as CSS variables
    document.documentElement.style.setProperty("--hotel-rose", active.primaryColor);
    document.documentElement.style.setProperty("--hotel-rose-deep", active.primaryStrongColor);
  }
  return true;
}

// 4. deleteTheme
export async function deleteTheme(id) {
  let themes = await getThemes();
  themes = themes.filter((t) => t.id !== Number(id));
  setStored("b2c_themes", themes);
  return true;
}

// 5. getActiveTheme
export async function getActiveTheme() {
  const themes = await getThemes();
  return themes.find((t) => t.isActive) || DEFAULT_THEMES[0];
}

// 6. getActiveLayout
export async function getActiveLayout() {
  return getStored("b2c_layout_config", DEFAULT_LAYOUT);
}

// 7. updateHeaderConfig
export async function updateHeaderConfig(headerConfig) {
  const layout = await getActiveLayout();
  layout.header = headerConfig;
  setStored("b2c_layout_config", layout);
  return layout;
}

// 8. updateFooterConfig
export async function updateFooterConfig(footerConfig) {
  const layout = await getActiveLayout();
  layout.footer = footerConfig;
  setStored("b2c_layout_config", layout);
  return layout;
}

// 9. getHomeTheme
export async function getHomeTheme() {
  return getStored("b2c_home_theme", DEFAULT_HOME_THEME);
}

// 10. updateHomeTheme
export async function updateHomeTheme(homeConfig) {
  setStored("b2c_home_theme", homeConfig);
  return homeConfig;
}
