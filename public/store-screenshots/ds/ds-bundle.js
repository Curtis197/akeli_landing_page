/* @ds-bundle: {"format":3,"namespace":"AkeliNutritionApp_cbe5c2","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"Card","sourcePath":"components/content/Card.jsx"},{"name":"ChatBubble","sourcePath":"components/content/ChatBubble.jsx"},{"name":"MealCard","sourcePath":"components/content/MealCard.jsx"},{"name":"RecipeCard","sourcePath":"components/content/RecipeCard.jsx"},{"name":"ShoppingRow","sourcePath":"components/content/ShoppingRow.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"MealTypeBadge","sourcePath":"components/feedback/Badge.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"MacroStat","sourcePath":"components/feedback/MacroStat.jsx"},{"name":"MacroRow","sourcePath":"components/feedback/MacroStat.jsx"},{"name":"ProgressRing","sourcePath":"components/feedback/ProgressRing.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressRing.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Radio","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Toggle","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Chip","sourcePath":"components/forms/Chip.jsx"},{"name":"SearchInput","sourcePath":"components/forms/SearchInput.jsx"},{"name":"TextField","sourcePath":"components/forms/SearchInput.jsx"},{"name":"WeightStepper","sourcePath":"components/forms/WeightStepper.jsx"},{"name":"Avatar","sourcePath":"components/media/Avatar.jsx"},{"name":"Icon","sourcePath":"components/media/Icon.jsx"},{"name":"BottomNav","sourcePath":"components/navigation/BottomNav.jsx"},{"name":"GlassHeader","sourcePath":"components/navigation/GlassHeader.jsx"},{"name":"IconButton","sourcePath":"components/navigation/GlassHeader.jsx"},{"name":"SectionHeader","sourcePath":"components/navigation/SectionHeader.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"480f52a8ba4a","components/content/Card.jsx":"f4c7540926cf","components/content/ChatBubble.jsx":"09570917c8f5","components/content/MealCard.jsx":"b42114445dc2","components/content/RecipeCard.jsx":"5e94dad03c5b","components/content/ShoppingRow.jsx":"c06ef932d86f","components/feedback/Badge.jsx":"125d8ef352a0","components/feedback/EmptyState.jsx":"8d1281acf2d5","components/feedback/MacroStat.jsx":"bd4638785f65","components/feedback/ProgressRing.jsx":"c0e39022eff4","components/forms/Checkbox.jsx":"a4da99fc65c0","components/forms/Chip.jsx":"0cfbdaaff3ff","components/forms/SearchInput.jsx":"7896e03a4077","components/forms/WeightStepper.jsx":"3e9731212a48","components/media/Avatar.jsx":"e886fff029ea","components/media/Icon.jsx":"948f4856f025","components/navigation/BottomNav.jsx":"10528ec40566","components/navigation/GlassHeader.jsx":"7fcf9e0dc3a9","components/navigation/SectionHeader.jsx":"45add637a6c4","components/navigation/TabBar.jsx":"7014a7a37eba","ui_kits/mobile-app/CommunityScreen.jsx":"4cb05cd0ba4e","ui_kits/mobile-app/HomeScreen.jsx":"43f7a030e98a","ui_kits/mobile-app/PlannerScreen.jsx":"e28c3ef5aa82","ui_kits/mobile-app/RecipeDetailScreen.jsx":"3aae37405387","ui_kits/mobile-app/RecipesScreen.jsx":"e53905fd1932"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AkeliNutritionApp_cbe5c2 = window.AkeliNutritionApp_cbe5c2 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/content/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — the organic container. 24px radius, white surface, tonal lift via a
 * whisper-soft ambient shadow (No-Line rule: no borders). Use `tone` to sit it
 * on a warmer surface tier instead. Ports the app's Card theme.
 */
function Card({
  children,
  tone = 'surface',
  padding = 20,
  elevated = true,
  style,
  ...rest
}) {
  const tones = {
    surface: 'var(--akeli-surface)',
    lowest: 'var(--akeli-surface-container-lowest)',
    low: 'var(--akeli-surface-container-low)',
    container: 'var(--akeli-surface-container)',
    mint: 'var(--akeli-secondary-container)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: tones[tone] || tones.surface,
      borderRadius: 'var(--akeli-radius-xl)',
      padding,
      boxShadow: elevated ? '0 4px 16px rgba(27,28,22,0.04)' : 'none',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Card.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — two shapes matching the app:
 * - "outline" (AkeliBadge): pill outline in a color, transparent fill.
 * - "solid"   (AkeliMacroBadge / meal-type): filled color pill, white text.
 * A macro value+label pair renders when both `value` and `children` are set.
 */
function Badge({
  children,
  value,
  variant = 'solid',
  color = 'var(--akeli-primary)',
  style,
  ...rest
}) {
  const solid = variant === 'solid';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '5px 12px',
      borderRadius: 'var(--akeli-radius-pill)',
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1.2,
      background: solid ? color : 'transparent',
      color: solid ? '#fff' : color,
      boxShadow: solid ? 'none' : `inset 0 0 0 1px ${color}`,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), value != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: value != null ? 400 : 700
    }
  }, children));
}

/**
 * MealTypeBadge — uppercase colored meal-type tag (breakfast/lunch/dinner/snack)
 * as seen on meal cards.
 */
function MealTypeBadge({
  type = 'lunch',
  label,
  style,
  ...rest
}) {
  const colors = {
    breakfast: 'var(--akeli-meal-breakfast)',
    lunch: 'var(--akeli-meal-lunch)',
    dinner: 'var(--akeli-meal-dinner)',
    snack: 'var(--akeli-meal-snack)'
  };
  const labels = {
    breakfast: 'Petit-déj',
    lunch: 'Déjeuner',
    dinner: 'Dîner',
    snack: 'Collation'
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      padding: '6px 10px',
      borderRadius: 'var(--akeli-radius-md)',
      background: colors[type] || colors.lunch,
      color: '#fff',
      fontFamily: 'var(--akeli-font-body)',
      fontWeight: 800,
      fontSize: 10,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      ...style
    }
  }, rest), (label || labels[type] || type).toUpperCase());
}
Object.assign(__ds_scope, { Badge, MealTypeBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressRing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ProgressRing — the dashboard metric ring. A soft track with a
 * gradient-swept progress arc and a big value in the center. Ports
 * AkeliModernMetric (80px, sweep gradient, round caps).
 */
function ProgressRing({
  progress = 0,
  value,
  unit,
  label,
  size = 96,
  stroke = 8,
  from = 'color-mix(in srgb, var(--akeli-primary) 35%, transparent)',
  to = 'var(--akeli-primary)',
  style,
  ...rest
}) {
  const p = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gid = React.useId ? React.useId().replace(/:/g, '') : 'akeliRing' + Math.round(Math.random() * 1e6);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: gid,
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: from
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: to
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--akeli-surface-container-high)",
    strokeWidth: stroke
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: `url(#${gid})`,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c * (1 - p),
    style: {
      transition: 'stroke-dashoffset var(--akeli-dur-slow) var(--akeli-ease)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-display)',
      fontSize: size * 0.24,
      fontWeight: 800,
      letterSpacing: '-0.5px',
      color: 'var(--akeli-on-surface)'
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--akeli-on-surface-variant)',
      marginTop: 3
    }
  }, unit))), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--akeli-on-surface-variant)'
    }
  }, label));
}

/**
 * ProgressBar — thin rounded track with an amber fill (recap calorie bar).
 */
function ProgressBar({
  progress = 0,
  color = 'var(--akeli-secondary)',
  height = 8,
  style,
  ...rest
}) {
  const p = Math.max(0, Math.min(1, progress));
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: '100%',
      height,
      background: 'var(--akeli-surface-container-high)',
      borderRadius: 'var(--akeli-radius-pill)',
      overflow: 'hidden',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${p * 100}%`,
      height: '100%',
      background: color,
      borderRadius: 'var(--akeli-radius-pill)',
      transition: 'width var(--akeli-dur-slow) var(--akeli-ease)'
    }
  }));
}
Object.assign(__ds_scope, { ProgressRing, ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressRing.jsx", error: String((e && e.message) || e) }); }

// components/media/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — thin wrapper over Material Symbols Rounded, the icon set the
 * Akeli app uses (Flutter Material Icons). Requires the Material Symbols
 * Rounded webfont, which is loaded by the design system's fonts.css.
 */
function Icon({
  name,
  size = 24,
  weight = 400,
  fill = 0,
  grade = 0,
  color = 'currentColor',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "material-symbols-rounded",
    "aria-hidden": "true",
    style: {
      fontFamily: "'Material Symbols Rounded'",
      fontSize: size,
      lineHeight: 1,
      color,
      display: 'inline-flex',
      userSelect: 'none',
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${Math.min(Math.max(size, 20), 48)}`,
      ...style
    }
  }, rest), name);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/Icon.jsx", error: String((e && e.message) || e) }); }

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Akeli's action button. The primary variant is the signature
 * teal gradient with a soft teal-tinted lift; 24px "organic" radius.
 * Ports AkeliGradientButton + the theme's button hierarchy.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leadingIcon,
  trailingIcon,
  style,
  ...rest
}) {
  const heights = {
    sm: 40,
    md: 52,
    lg: 56
  };
  const fontSizes = {
    sm: 14,
    md: 16,
    lg: 17
  };
  const isDisabled = disabled || loading;
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: heights[size],
    padding: `0 ${size === 'sm' ? 20 : 28}px`,
    width: fullWidth ? '100%' : undefined,
    border: 'none',
    borderRadius: 'var(--akeli-radius-xl)',
    fontFamily: 'var(--akeli-font-display)',
    fontWeight: 700,
    fontSize: fontSizes[size],
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'transform var(--akeli-dur-fast) var(--akeli-ease), filter var(--akeli-dur-fast) var(--akeli-ease), opacity var(--akeli-dur-fast) var(--akeli-ease)',
    whiteSpace: 'nowrap'
  };
  const variants = {
    primary: {
      background: 'var(--akeli-gradient-brand)',
      color: '#fff',
      boxShadow: 'var(--akeli-shadow-cta)'
    },
    secondary: {
      background: 'var(--akeli-secondary-container)',
      color: 'var(--akeli-on-secondary-container)'
    },
    amber: {
      background: 'var(--akeli-accent-amber)',
      color: '#fff',
      boxShadow: '0 8px 16px rgba(255,159,28,0.24)'
    },
    ghost: {
      background: 'var(--akeli-surface-container-highest)',
      color: 'var(--akeli-on-surface-variant)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--akeli-primary)',
      boxShadow: 'inset 0 0 0 1.5px var(--akeli-primary)'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: isDisabled,
    onMouseDown: e => {
      if (!isDisabled) e.currentTarget.style.transform = 'scale(0.97)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    style: {
      ...base,
      ...variants[variant],
      opacity: isDisabled && !loading ? 0.55 : 1,
      ...style
    }
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      border: '2.5px solid rgba(255,255,255,0.4)',
      borderTopColor: variant === 'secondary' || variant === 'ghost' || variant === 'outline' ? 'var(--akeli-primary)' : '#fff',
      animation: 'akeli-spin 0.7s linear infinite'
    }
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, leadingIcon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: leadingIcon,
    size: fontSizes[size] + 3,
    color: "currentColor"
  }), children, trailingIcon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: trailingIcon,
    size: fontSizes[size] + 3,
    color: "currentColor"
  })), /*#__PURE__*/React.createElement("style", null, `@keyframes akeli-spin { to { transform: rotate(360deg); } }`));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/content/ChatBubble.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ChatBubble — community / AI message bubble. Sent bubbles use a soft blue
 * tint with a squared bottom-right corner; received bubbles are white with a
 * soft shadow and a squared bottom-left corner. Optional sender name (teal)
 * and read receipt. Ports AkeliChatBubble (text variant).
 */
function ChatBubble({
  message,
  time,
  sent = false,
  sender,
  read = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: sent ? 'flex-end' : 'flex-start',
      maxWidth: '75%',
      marginLeft: sent ? 'auto' : 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: sent ? 'color-mix(in srgb, var(--akeli-info) 15%, transparent)' : 'var(--akeli-surface)',
      boxShadow: sent ? 'none' : 'var(--akeli-shadow-sm)',
      borderRadius: 'var(--akeli-radius-md)',
      borderBottomRightRadius: sent ? 0 : 'var(--akeli-radius-md)',
      borderBottomLeftRadius: sent ? 'var(--akeli-radius-md)' : 0
    }
  }, sender && !sent && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--akeli-primary)',
      marginBottom: 4
    }
  }, sender), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--akeli-on-surface)'
    }
  }, message)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginTop: 3
    }
  }, time && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 11,
      color: 'var(--akeli-on-surface-variant)'
    }
  }, time), sent && read && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "done_all",
    size: 13,
    color: "var(--akeli-success)"
  })));
}
Object.assign(__ds_scope, { ChatBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ChatBubble.jsx", error: String((e && e.message) || e) }); }

// components/content/MealCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MealCard — the dashboard/planner meal card. Two variants:
 * - "dashboard": white card, image on top, meal-type badge, consumed toggle,
 *   title + calories below.
 * - "editorial": full-bleed image with gradient scrim and overlaid text
 *   (the planner hero card).
 * Ports AkeliMealCard.
 */
function MealCard({
  title,
  mealType = 'lunch',
  calories,
  duration = 20,
  image,
  variant = 'dashboard',
  consumed = false,
  onToggle,
  onClick,
  width = 300,
  style,
  ...rest
}) {
  const placeholder = h => /*#__PURE__*/React.createElement("div", {
    style: {
      height: h,
      width: '100%',
      background: 'var(--akeli-surface-container-high)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "restaurant_menu",
    size: 44,
    color: "var(--akeli-outline)"
  }));
  const toggle = onToggle && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      onToggle(e);
    },
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      cursor: 'pointer',
      flexShrink: 0,
      border: `2px solid ${consumed ? 'var(--akeli-success)' : '#fff'}`,
      background: consumed ? 'var(--akeli-success)' : 'rgba(255,255,255,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 4px rgba(27,28,22,0.12)'
    }
  }, consumed && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 18,
    color: "#fff",
    weight: 600
  }));
  if (variant === 'editorial') {
    return /*#__PURE__*/React.createElement("div", _extends({
      onClick: onClick,
      style: {
        position: 'relative',
        width,
        height: width,
        borderRadius: 'var(--akeli-radius-xl)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 12px 24px rgba(27,28,22,0.10)',
        ...style
      }
    }, rest), image ? /*#__PURE__*/React.createElement("img", {
      src: image,
      alt: "",
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    }) : placeholder(width), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, transparent 45%, rgba(0,0,0,0.72) 100%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }
    }, toggle || /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement(__ds_scope.MealTypeBadge, {
      type: mealType
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--akeli-font-display)',
        color: '#fff',
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1.2
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
        color: '#fff'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 14,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "local_fire_department",
      fill: 1,
      size: 16,
      color: "#EBA14D"
    }), " ", Math.round(calories), " kcal"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "schedule",
      size: 16,
      color: "rgba(255,255,255,0.8)"
    }), " ", duration, " min"))));
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      width,
      background: consumed ? 'var(--akeli-surface-container-lowest)' : 'var(--akeli-surface)',
      borderRadius: 'var(--akeli-radius-xl)',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: '0 4px 12px rgba(27,28,22,0.03)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      height: 180,
      width: '100%',
      objectFit: 'cover',
      display: 'block',
      filter: consumed ? 'grayscale(1)' : 'none'
    }
  }) : placeholder(180), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      right: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.MealTypeBadge, {
    type: mealType
  })), toggle && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12
    }
  }, toggle)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontWeight: 700,
      fontSize: 16,
      color: consumed ? 'var(--akeli-on-surface-variant)' : 'var(--akeli-on-surface)',
      textDecoration: consumed ? 'line-through' : 'none'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--akeli-on-surface-variant)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "local_fire_department",
    fill: 1,
    size: 14,
    color: "#EBA14D"
  }), " ", Math.round(calories), " kcal"), consumed && /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 8px',
      borderRadius: 8,
      background: 'color-mix(in srgb, var(--akeli-success) 12%, transparent)',
      color: 'var(--akeli-success)',
      fontSize: 11,
      fontWeight: 600
    }
  }, "Consomm\xE9"))));
}
Object.assign(__ds_scope, { MealCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/MealCard.jsx", error: String((e && e.message) || e) }); }

// components/content/RecipeCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * RecipeCard — feed / discovery recipe card. Image with a floating like button
 * and a duration badge; title, macro chips, rating + difficulty below.
 * Ports RecipeCard.
 */
function RecipeCard({
  title,
  image,
  minutes = 30,
  calories,
  protein,
  difficulty = 'easy',
  rating,
  ratingCount,
  likeCount,
  liked = false,
  onLike,
  onClick,
  style,
  ...rest
}) {
  const diff = {
    easy: {
      label: 'Facile',
      color: 'var(--akeli-success)'
    },
    medium: {
      label: 'Moyen',
      color: 'var(--akeli-secondary)'
    },
    hard: {
      label: 'Difficile',
      color: 'var(--akeli-error)'
    }
  }[difficulty] || {
    label: difficulty,
    color: 'var(--akeli-outline)'
  };
  const fmtTime = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? m % 60 + 'min' : ''}` : `${m}min`;
  const macroChip = (label, color) => /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 8px',
      borderRadius: 'var(--akeli-radius-pill)',
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      color,
      fontSize: 11,
      fontWeight: 500
    }
  }, label);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      background: 'var(--akeli-surface)',
      borderRadius: 'var(--akeli-radius-xl)',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: '0 4px 16px rgba(27,28,22,0.05)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '4 / 3',
      background: 'var(--akeli-surface-container-lowest)'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "restaurant",
    size: 40,
    color: "var(--akeli-primary)"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      onLike && onLike(e);
    },
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 34,
      height: 34,
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(255,255,255,0.92)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: liked ? 'favorite' : 'favorite',
    fill: liked ? 1 : 0,
    size: 18,
    color: liked ? 'var(--akeli-error)' : 'var(--akeli-on-surface-variant)'
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: '3px 9px',
      borderRadius: 'var(--akeli-radius-pill)',
      background: 'rgba(0,0,0,0.6)',
      color: '#fff',
      fontSize: 11,
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "timer",
    size: 12,
    color: "#fff"
  }), " ", fmtTime(minutes))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--akeli-on-surface)',
      lineHeight: 1.3
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      flexWrap: 'wrap'
    }
  }, calories != null && macroChip(`${Math.round(calories)} kcal/100g`, 'var(--akeli-secondary)'), protein != null && macroChip(`${protein}g prot.`, 'var(--akeli-primary)')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 10
    }
  }, rating != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--akeli-on-surface)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "star",
    fill: 1,
    size: 15,
    color: "var(--akeli-secondary)"
  }), " ", rating, ratingCount != null && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--akeli-on-surface-variant)',
      fontWeight: 400
    }
  }, "(", ratingCount, ")")), likeCount != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--akeli-primary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bookmark",
    fill: 1,
    size: 13,
    color: "var(--akeli-primary)"
  }), " ", likeCount), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      padding: '2px 8px',
      borderRadius: 'var(--akeli-radius-pill)',
      background: `color-mix(in srgb, ${diff.color} 12%, transparent)`,
      color: diff.color,
      fontSize: 11,
      fontWeight: 500
    }
  }, diff.label))));
}
Object.assign(__ds_scope, { RecipeCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/RecipeCard.jsx", error: String((e && e.message) || e) }); }

// components/content/ShoppingRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ShoppingRow — a shopping-list item. Circular check on the left, name +
 * optional price line, quantity pill on the right. Checked state dims the row,
 * strikes text, and drops the shadow. Ports AkeliShoppingRow.
 */
function ShoppingRow({
  name,
  quantity,
  price,
  checked = false,
  onToggle,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onToggle,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: 16,
      borderRadius: 'var(--akeli-radius-md)',
      cursor: 'pointer',
      background: checked ? 'var(--akeli-surface-container-low)' : 'var(--akeli-surface-container-lowest)',
      boxShadow: checked ? 'none' : '0 4px 12px rgba(27,28,22,0.02)',
      opacity: checked ? 0.6 : 1,
      transition: 'background var(--akeli-dur-base) var(--akeli-ease), opacity var(--akeli-dur-base) var(--akeli-ease)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      flexShrink: 0,
      border: checked ? 'none' : '2px solid var(--akeli-outline-variant)',
      background: checked ? 'var(--akeli-primary)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 15,
    weight: 600,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 16,
      fontWeight: 500,
      color: checked ? 'var(--akeli-on-surface-variant)' : 'var(--akeli-on-surface)',
      textDecoration: checked ? 'line-through' : 'none'
    }
  }, name), price && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: checked ? 'var(--akeli-on-surface-variant)' : 'var(--akeli-primary)',
      marginTop: 2
    }
  }, price)), quantity && /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 12px',
      borderRadius: 'var(--akeli-radius-pill)',
      background: checked ? 'var(--akeli-surface-container-highest)' : 'var(--akeli-surface-container)',
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--akeli-on-surface-variant)',
      textDecoration: checked ? 'line-through' : 'none',
      flexShrink: 0
    }
  }, quantity));
}
Object.assign(__ds_scope, { ShoppingRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ShoppingRow.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EmptyState — centered illustration-free empty / error state. A soft teal
 * disc holds a glyph; title + optional subtitle + optional action. Ports
 * EmptyState / ErrorState.
 */
function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: 'var(--akeli-space-xl)',
      maxWidth: 420,
      margin: '0 auto',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 80,
      borderRadius: '50%',
      background: 'color-mix(in srgb, var(--akeli-primary) 10%, transparent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 'var(--akeli-space-lg)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 40,
    color: "var(--akeli-primary)"
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--akeli-font-display)',
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--akeli-on-surface)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '8px 0 0',
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 14,
      lineHeight: 1.6,
      color: 'var(--akeli-on-surface-variant)'
    }
  }, subtitle), actionLabel && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--akeli-space-xl)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    onClick: onAction
  }, actionLabel)));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/MacroStat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MacroStat — tinted nutrition tile (calories / protein / carbs / fat).
 * Background is the macro color at 10%, with a soft same-color ghost ring;
 * value + unit + label stacked. Ports MacroCard.
 */
function MacroStat({
  label,
  value,
  unit,
  color = 'var(--akeli-primary)',
  icon,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)`,
      borderRadius: 'var(--akeli-radius-md)',
      padding: '10px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      minWidth: 0,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    fill: 1,
    color: color,
    style: {
      marginBottom: 2
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-display)',
      fontSize: 18,
      fontWeight: 700,
      color
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 10,
      color
    }
  }, unit), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 11,
      color: 'var(--akeli-on-surface-variant)',
      marginTop: 2
    }
  }, label));
}

/**
 * MacroRow — the standard calories / protéines / glucides / lipides row.
 */
function MacroRow({
  calories,
  protein,
  carbs,
  fat,
  style,
  ...rest
}) {
  const cells = [calories != null && {
    label: 'Calories',
    value: Math.round(calories),
    unit: 'kcal',
    color: 'var(--akeli-secondary)',
    icon: 'local_fire_department'
  }, protein != null && {
    label: 'Protéines',
    value: `${Math.round(protein)}g`,
    color: 'var(--akeli-primary)',
    icon: 'fitness_center'
  }, carbs != null && {
    label: 'Glucides',
    value: `${Math.round(carbs)}g`,
    color: 'var(--akeli-violet)',
    icon: 'grain'
  }, fat != null && {
    label: 'Lipides',
    value: `${Math.round(fat)}g`,
    color: 'var(--akeli-warning)',
    icon: 'water_drop'
  }].filter(Boolean);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
      gap: 8,
      ...style
    }
  }, rest), cells.map(c => /*#__PURE__*/React.createElement(MacroStat, _extends({
    key: c.label
  }, c))));
}
Object.assign(__ds_scope, { MacroStat, MacroRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/MacroStat.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Checkbox — circular check used in shopping lists (checked = teal disc with
 * white tick; unchecked = 2px outline-variant ring). Ports AkeliShoppingRow's
 * toggle and the app's rounded check affordance.
 */
function Checkbox({
  checked = false,
  onChange,
  size = 24,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "checkbox",
    "aria-checked": checked,
    onClick: onChange,
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      border: checked ? 'none' : '2px solid var(--akeli-outline-variant)',
      background: checked ? 'var(--akeli-primary)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0,
      flexShrink: 0,
      transition: 'background var(--akeli-dur-fast) var(--akeli-ease)',
      ...style
    }
  }, rest), checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: size * 0.66,
    weight: 600,
    color: "#fff"
  }));
}

/**
 * Radio — single-select circle. Selected shows a filled teal dot inside a
 * teal ring; unselected is a muted ring.
 */
function Radio({
  selected = false,
  onChange,
  label,
  size = 22,
  style,
  ...rest
}) {
  const ring = /*#__PURE__*/React.createElement("span", _extends({
    onClick: onChange,
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      border: `2px solid ${selected ? 'var(--akeli-primary)' : 'var(--akeli-outline-variant)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'border-color var(--akeli-dur-fast) var(--akeli-ease)'
    }
  }, rest), selected && /*#__PURE__*/React.createElement("span", {
    style: {
      width: size * 0.45,
      height: size * 0.45,
      borderRadius: '50%',
      background: 'var(--akeli-primary)'
    }
  }));
  if (!label) return React.cloneElement(ring, {
    style: {
      ...ring.props.style,
      ...style
    }
  });
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      ...style
    }
  }, ring, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--akeli-on-surface)'
    }
  }, label));
}

/**
 * Toggle — pill switch. On = brand teal track.
 */
function Toggle({
  checked = false,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": checked,
    onClick: onChange,
    style: {
      width: 48,
      height: 28,
      borderRadius: 'var(--akeli-radius-pill)',
      border: 'none',
      background: checked ? 'var(--akeli-primary)' : 'var(--akeli-surface-container-highest)',
      position: 'relative',
      cursor: 'pointer',
      padding: 0,
      transition: 'background var(--akeli-dur-base) var(--akeli-ease)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 23 : 3,
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(27,28,22,0.25)',
      transition: 'left var(--akeli-dur-base) var(--akeli-ease)'
    }
  }));
}
Object.assign(__ds_scope, { Checkbox, Radio, Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Chip — pill-shaped filter / tag. Default sits on a soft surface fill;
 * active fills with brand teal; editorial uses warm amber (tertiary-fixed)
 * for high-priority filters. Ports the app's filter tags + editorial chips.
 */
function Chip({
  children,
  active = false,
  variant = 'default',
  icon,
  onRemove,
  style,
  ...rest
}) {
  const palettes = {
    default: active ? {
      background: 'var(--akeli-primary)',
      color: '#fff'
    } : {
      background: 'var(--akeli-surface-container-high)',
      color: 'var(--akeli-on-surface-variant)'
    },
    editorial: {
      background: 'var(--akeli-tertiary-fixed)',
      color: 'var(--akeli-on-tertiary-fixed)'
    }
  };
  const pal = palettes[variant] || palettes.default;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 14px',
      borderRadius: 'var(--akeli-radius-pill)',
      border: 'none',
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'background var(--akeli-dur-fast) var(--akeli-ease)',
      ...pal,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    color: "currentColor"
  }), children, onRemove && /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      display: 'inline-flex',
      marginLeft: 2,
      marginRight: -4,
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 15,
    color: "currentColor"
  })));
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Chip.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SearchInput — rounded pill search field on a soft surface fill.
 * No border (No-Line rule); focus lifts the fill slightly.
 */
function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher',
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: focused ? 'var(--akeli-surface)' : 'var(--akeli-surface-container-high)',
      boxShadow: focused ? '0 0 0 2px rgba(0,80,74,0.4)' : 'none',
      borderRadius: 'var(--akeli-radius-pill)',
      padding: '11px 18px',
      transition: 'background var(--akeli-dur-fast) var(--akeli-ease), box-shadow var(--akeli-dur-fast) var(--akeli-ease)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 20,
    color: "var(--akeli-outline)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 14,
      color: 'var(--akeli-on-surface)'
    }
  }, rest)));
}

/**
 * TextField — labelled input. Label is tracked-out label-md above the field;
 * field uses surface-container-highest with a 2px teal ghost focus ring.
 */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  leadingIcon,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--akeli-on-surface-variant)',
      marginBottom: 8
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--akeli-surface-container-highest)',
      borderRadius: 'var(--akeli-radius-md)',
      padding: '14px 16px',
      boxShadow: focused ? '0 0 0 2px rgba(0,80,74,0.4)' : 'none',
      transition: 'box-shadow var(--akeli-dur-fast) var(--akeli-ease)'
    }
  }, leadingIcon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: leadingIcon,
    size: 20,
    color: "var(--akeli-outline)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 15,
      color: 'var(--akeli-on-surface)'
    }
  }, rest))));
}
Object.assign(__ds_scope, { SearchInput, TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/WeightStepper.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * WeightStepper — the home-screen weight control. A big value in teal with
 * −/+ circular steppers; the active (+) button is filled teal. Ports
 * AkeliWeightStepper (white card, soft float shadow, 24px radius).
 */
function WeightStepper({
  value = 70,
  unit = 'kg',
  step = 0.1,
  onChange,
  style,
  ...rest
}) {
  const fmt = n => (Math.round(n * 10) / 10).toFixed(1);
  const btn = active => ({
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: active ? 'var(--akeli-primary-container)' : 'var(--akeli-surface-container-high)',
    color: active ? '#fff' : 'var(--akeli-on-surface-variant)'
  });
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--akeli-surface)',
      borderRadius: 'var(--akeli-radius-xl)',
      boxShadow: '0 10px 20px rgba(27,28,22,0.03)',
      padding: 'var(--akeli-space-lg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--akeli-space-xl)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: btn(false),
    onClick: () => onChange && onChange(+(value - step))
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "remove",
    size: 20,
    color: "currentColor"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-display)',
      fontSize: 48,
      fontWeight: 900,
      letterSpacing: '-1.5px',
      lineHeight: 1,
      color: 'var(--akeli-primary-container)'
    }
  }, fmt(value)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '2px',
      textTransform: 'uppercase',
      color: 'var(--akeli-on-surface-variant)',
      opacity: 0.5,
      marginTop: 6
    }
  }, unit)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: btn(true),
    onClick: () => onChange && onChange(+(value + step))
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "add",
    size: 20,
    color: "currentColor"
  })));
}
Object.assign(__ds_scope, { WeightStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/WeightStepper.jsx", error: String((e && e.message) || e) }); }

// components/media/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 32,
  md: 48,
  lg: 80
};

/**
 * Avatar — circular user image with initials or person-icon fallback.
 * Fallback background is brand teal with white text (matches AkeliAvatar).
 */
function Avatar({
  src,
  initials,
  size = 'md',
  borderColor,
  alt = '',
  style,
  ...rest
}) {
  const d = typeof size === 'number' ? size : SIZES[size] || SIZES.md;
  const inner = /*#__PURE__*/React.createElement("div", {
    style: {
      width: d,
      height: d,
      borderRadius: '50%',
      background: 'var(--akeli-primary)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      fontFamily: 'var(--akeli-font-body)',
      fontWeight: 600,
      fontSize: d * 0.35
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials ? initials : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "person",
    fill: 1,
    size: d * 0.55,
    color: "#fff"
  }));
  if (!borderColor) return React.cloneElement(inner, {
    style: {
      ...inner.props.style,
      ...style
    },
    ...rest
  });
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: d + 5,
      height: d + 5,
      borderRadius: '50%',
      border: `2px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style
    }
  }, rest), inner);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BottomNav.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DEFAULT_ITEMS = [{
  icon: 'home',
  label: 'Accueil'
}, {
  icon: 'restaurant_menu',
  label: 'Repas'
}, {
  icon: 'menu_book',
  label: 'Recettes'
}, {
  icon: 'group',
  label: 'Communauté'
}];

/**
 * BottomNav — the app's 4-tab bottom navigation. Active tab shows a filled
 * glyph in teal on a soft teal pill; inactive tabs are outlined + muted.
 * Ports MainShell's NavigationBar.
 */
function BottomNav({
  items = DEFAULT_ITEMS,
  value = 0,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      background: 'var(--akeli-surface)',
      borderTop: '1px solid rgba(27,28,22,0.05)',
      padding: '10px 8px 12px',
      ...style
    }
  }, rest), items.map((it, i) => {
    const active = i === value;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      onClick: () => onChange && onChange(i),
      style: {
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: 0,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 30,
        borderRadius: 'var(--akeli-radius-pill)',
        background: active ? 'color-mix(in srgb, var(--akeli-primary) 12%, transparent)' : 'transparent',
        transition: 'background var(--akeli-dur-fast) var(--akeli-ease)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      fill: active ? 1 : 0,
      size: 24,
      color: active ? 'var(--akeli-primary)' : 'var(--akeli-on-surface-variant)'
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--akeli-font-body)',
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--akeli-primary)' : 'var(--akeli-on-surface-variant)'
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { BottomNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BottomNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/GlassHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * GlassHeader — the frosted "sanctuary" app bar. surface at 80% opacity with a
 * 20px backdrop blur and a felt-not-seen ghost border. Optional back button,
 * centered/leading title, and trailing actions. Ports AkeliGlassHeader.
 */
function GlassHeader({
  title,
  showBack = false,
  onBack,
  actions,
  center = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 60,
      padding: '0 16px',
      background: 'var(--akeli-glass-bg)',
      backdropFilter: 'blur(var(--akeli-glass-blur))',
      WebkitBackdropFilter: 'blur(var(--akeli-glass-blur))',
      borderBottom: '1px solid rgba(27,28,22,0.05)',
      ...style
    }
  }, rest), showBack && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onBack,
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      display: 'flex',
      padding: 6,
      marginLeft: -6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow_back_ios_new",
    size: 20,
    color: "var(--akeli-on-surface)"
  })), title && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--akeli-font-display)',
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: 'var(--akeli-on-surface)',
      textAlign: center ? 'center' : 'left'
    }
  }, title), !title && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, actions));
}

/**
 * IconButton — circular tap target for header actions / toolbars.
 */
function IconButton({
  icon,
  badge = false,
  color = 'var(--akeli-secondary)',
  size = 24,
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    style: {
      position: 'relative',
      width: 40,
      height: 40,
      borderRadius: '50%',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size,
    color: color
  }), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--akeli-accent-amber)',
      border: '1.5px solid var(--akeli-surface)'
    }
  }));
}
Object.assign(__ds_scope, { GlassHeader, IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/GlassHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SectionHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SectionHeader — a titled row that opens a content section. Title is
 * body-lg 700 in a color (teal by default); optional trailing "voir tout"
 * link with a chevron. Ports AkeliSectionHeader.
 */
function SectionHeader({
  title,
  color = 'var(--akeli-primary)',
  trailingLabel,
  onTrailingClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--akeli-font-display)',
      fontSize: 18,
      fontWeight: 700,
      color
    }
  }, title), trailingLabel && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onTrailingClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--akeli-font-body)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--akeli-on-surface-variant)',
      padding: '2px 4px'
    }
  }, trailingLabel, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron_right",
    size: 16,
    color: "var(--akeli-on-surface-variant)"
  })));
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TabBar — underline tab strip. Selected tab shows brand-teal label + a 2px
 * underline; others are muted. Ports AkeliTabBar.
 */
function TabBar({
  tabs = [],
  value = 0,
  onChange,
  color = 'var(--akeli-primary)',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      ...style
    }
  }, rest), tabs.map((t, i) => {
    const active = i === value;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      onClick: () => onChange && onChange(i),
      style: {
        flex: 1,
        padding: '12px 16px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--akeli-font-body)',
        fontSize: 14,
        fontWeight: active ? 700 : 600,
        color: active ? color : 'var(--akeli-on-surface-variant)',
        borderBottom: `2px solid ${active ? color : 'transparent'}`,
        transition: 'color var(--akeli-dur-fast) var(--akeli-ease)'
      }
    }, t);
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/CommunityScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const {
    GlassHeader,
    ChatBubble,
    Avatar,
    TabBar,
    Icon
  } = window.AkeliNutritionApp_cbe5c2;
  const SEED = [{
    sender: 'Awa',
    message: 'Bonjour à toutes 🌿 Vous avez essayé la sauce arachide repensée ?',
    time: '14:28'
  }, {
    sent: true,
    message: 'Oui ! Un délice, et je mange à ma faim. Je referai ce soir.',
    time: '14:30',
    read: true
  }, {
    sender: 'Fatou',
    message: 'Partage la recette stp 🙏',
    time: '14:31'
  }, {
    sender: 'Awa',
    message: 'Je viens de l\'ajouter au groupe, regardez l\'onglet Recettes.',
    time: '14:32'
  }];
  function CommunityScreen() {
    const [tab, setTab] = React.useState(0);
    const [msgs, setMsgs] = React.useState(SEED);
    const [draft, setDraft] = React.useState('');
    const send = () => {
      if (!draft.trim()) return;
      setMsgs(m => [...m, {
        sent: true,
        message: draft.trim(),
        time: 'maintenant',
        read: false
      }]);
      setDraft('');
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }
    }, /*#__PURE__*/React.createElement(GlassHeader, {
      title: "Cuisine d'ici",
      showBack: true,
      actions: /*#__PURE__*/React.createElement(Avatar, {
        initials: "C",
        size: "sm"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--akeli-surface)'
      }
    }, /*#__PURE__*/React.createElement(TabBar, {
      tabs: ["Discussion", "Membres"],
      value: tab,
      onChange: setTab
    })), tab === 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, msgs.map((m, i) => /*#__PURE__*/React.createElement(ChatBubble, _extends({
      key: i
    }, m)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(27,28,22,0.05)',
        background: 'var(--akeli-surface)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--akeli-surface-container-high)',
        borderRadius: 'var(--akeli-radius-pill)',
        padding: '10px 16px'
      }
    }, /*#__PURE__*/React.createElement("input", {
      value: draft,
      onChange: e => setDraft(e.target.value),
      onKeyDown: e => e.key === 'Enter' && send(),
      placeholder: "Votre message",
      style: {
        flex: 1,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontFamily: 'var(--akeli-font-body)',
        fontSize: 14,
        color: 'var(--akeli-on-surface)'
      }
    })), /*#__PURE__*/React.createElement("button", {
      onClick: send,
      style: {
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: 'none',
        background: 'var(--akeli-gradient-brand)',
        boxShadow: 'var(--akeli-shadow-cta)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      fill: 1,
      size: 20,
      color: "#fff"
    })))) : /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, ['Awa Diop', 'Fatou N.', 'Victoire (vous)', 'Mariam K.', 'Céline B.'].map((n, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      initials: n[0],
      size: "md",
      borderColor: i === 2 ? 'var(--akeli-accent-amber)' : undefined
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--akeli-font-body)',
        fontWeight: 600,
        fontSize: 15,
        color: 'var(--akeli-on-surface)'
      }
    }, n), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--akeli-on-surface-variant)'
      }
    }, i === 0 ? 'Créatrice · Afrique de l\'Ouest' : 'Membre'))))));
  }
  window.CommunityScreen = CommunityScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/CommunityScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const IMG = '../../assets/sample/';
  const {
    ProgressRing,
    WeightStepper,
    SectionHeader,
    MealCard,
    RecipeCard,
    Avatar,
    IconButton
  } = window.AkeliNutritionApp_cbe5c2;
  const HOME_MEALS = [{
    title: 'Œuf mollet – pain complet',
    mealType: 'breakfast',
    calories: 400,
    image: IMG + 'dish-oeuf.png',
    duration: 25
  }, {
    title: 'Sauce arachide – riz blanc',
    mealType: 'lunch',
    calories: 520,
    image: IMG + 'dish-arachide.png',
    duration: 30
  }, {
    title: 'Sauce gouagouassou – foutou',
    mealType: 'dinner',
    calories: 640,
    image: IMG + 'dish-gouagouassou.png',
    duration: 45
  }];
  const HOME_RECIPES = [{
    title: 'Sauce arachide – riz blanc',
    image: IMG + 'dish-arachide.png',
    minutes: 30,
    calories: 180,
    protein: 9,
    difficulty: 'medium',
    rating: 4.6,
    ratingCount: 128,
    likeCount: 42,
    liked: true
  }, {
    title: 'Sauce gouagouassou – foutou',
    image: IMG + 'dish-gouagouassou.png',
    minutes: 45,
    calories: 210,
    protein: 12,
    difficulty: 'hard',
    rating: 4.8,
    ratingCount: 76,
    likeCount: 31
  }];
  function HomeScreen({
    onOpenRecipe
  }) {
    const [weight, setWeight] = React.useState(72.5);
    const [consumed, setConsumed] = React.useState({
      0: true
    });
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px 0'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      initials: "V",
      size: "sm"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      icon: "notifications",
      badge: true
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "settings"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 20px 4px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--akeli-font-body)',
        fontSize: 13,
        color: 'var(--akeli-on-surface-variant)'
      }
    }, "Bonjour,"), /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: '2px 0 0',
        fontFamily: 'var(--akeli-font-display)',
        fontSize: 26,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: 'var(--akeli-on-surface)'
      }
    }, "Victoire")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-around',
        padding: '18px 12px 8px'
      }
    }, /*#__PURE__*/React.createElement(ProgressRing, {
      progress: 0.6,
      value: "6.0 %",
      label: "Suivi du poids",
      size: 104
    }), /*#__PURE__*/React.createElement(ProgressRing, {
      progress: 0.42,
      value: "670",
      unit: "kcal",
      label: "Aujourd'hui",
      size: 104,
      from: "color-mix(in srgb, var(--akeli-secondary) 35%, transparent)",
      to: "var(--akeli-secondary)"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px 20px 4px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        fontFamily: 'var(--akeli-font-display)',
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--akeli-on-surface)',
        marginBottom: 12
      }
    }, "Mettre \xE0 jour son poids"), /*#__PURE__*/React.createElement(WeightStepper, {
      value: weight,
      unit: "kg",
      onChange: setWeight
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 20px 0'
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Vos repas du jour",
      trailingLabel: "Voir tout"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        padding: '14px 20px 4px',
        scrollbarWidth: 'none'
      }
    }, HOME_MEALS.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(MealCard, _extends({}, m, {
      width: 220,
      consumed: !!consumed[i],
      onToggle: () => setConsumed(c => ({
        ...c,
        [i]: !c[i]
      })),
      onClick: () => onOpenRecipe(m)
    }))))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '22px 20px 0'
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Recettes pour vous",
      trailingLabel: "Voir tout"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14,
        padding: '14px 20px 24px'
      }
    }, HOME_RECIPES.map((r, i) => /*#__PURE__*/React.createElement(RecipeCard, _extends({
      key: i
    }, r, {
      onClick: () => onOpenRecipe(r),
      onLike: () => {}
    })))));
  }
  window.HomeScreen = HomeScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/PlannerScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const PIMG = '../../assets/sample/';
  const {
    GlassHeader,
    TabBar,
    SectionHeader,
    MealCard,
    ShoppingRow,
    ProgressBar,
    Card
  } = window.AkeliNutritionApp_cbe5c2;
  const DAY_MEALS = [{
    title: 'Œuf mollet – pain complet',
    mealType: 'breakfast',
    calories: 400,
    image: PIMG + 'dish-oeuf.png',
    duration: 25
  }, {
    title: 'Sauce arachide – riz blanc',
    mealType: 'lunch',
    calories: 520,
    image: PIMG + 'dish-arachide.png',
    duration: 30
  }, {
    title: 'Sauce gouagouassou – foutou',
    mealType: 'dinner',
    calories: 640,
    image: PIMG + 'dish-gouagouassou.png',
    duration: 45
  }];
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  function PlannerScreen({
    onOpenRecipe
  }) {
    const [day, setDay] = React.useState(3);
    const [checked, setChecked] = React.useState({
      1: true
    });
    const shopping = [{
      name: 'Poulet',
      quantity: '500 g',
      price: '4,20 €'
    }, {
      name: 'Pâte d\'arachide',
      quantity: '250 g',
      price: '1,80 €'
    }, {
      name: 'Riz blanc',
      quantity: '500 g',
      price: '0,95 €'
    }, {
      name: 'Oignons',
      quantity: '3',
      price: '0,60 €'
    }];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(GlassHeader, {
      title: "Planning",
      center: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '4px 20px 0',
        scrollbarWidth: 'none'
      }
    }, DAYS.map((d, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => setDay(i),
      style: {
        flex: 1,
        minWidth: 42,
        border: 'none',
        cursor: 'pointer',
        borderRadius: 'var(--akeli-radius-md)',
        padding: '10px 0',
        background: i === day ? 'var(--akeli-gradient-brand)' : 'var(--akeli-surface-container-high)',
        color: i === day ? '#fff' : 'var(--akeli-on-surface-variant)',
        fontFamily: 'var(--akeli-font-body)',
        fontWeight: 700,
        fontSize: 13
      }
    }, d))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '18px 20px 0'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "lowest",
      padding: 16,
      elevated: false
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--akeli-font-body)',
        fontWeight: 700,
        fontSize: 14,
        color: 'var(--akeli-on-surface)'
      }
    }, "Jeudi 12 mars"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--akeli-font-display)',
        fontWeight: 700,
        fontSize: 15,
        color: 'var(--akeli-primary)'
      }
    }, "1 240 / 1 600 kcal")), /*#__PURE__*/React.createElement(ProgressBar, {
      progress: 0.775
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 20px 0'
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Repas planifi\xE9s"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '14px 20px 0'
      }
    }, DAY_MEALS.map((m, i) => /*#__PURE__*/React.createElement(MealCard, _extends({
      key: i
    }, m, {
      width: "100%",
      consumed: i === 0,
      onToggle: () => {},
      onClick: () => onOpenRecipe(m)
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '22px 20px 0'
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Liste de courses",
      trailingLabel: "Tout cocher"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 20px 24px'
      }
    }, shopping.map((s, i) => /*#__PURE__*/React.createElement(ShoppingRow, _extends({
      key: i
    }, s, {
      checked: !!checked[i],
      onToggle: () => setChecked(c => ({
        ...c,
        [i]: !c[i]
      }))
    })))));
  }
  window.PlannerScreen = PlannerScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/PlannerScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/RecipeDetailScreen.jsx
try { (() => {
(function () {
  const {
    GlassHeader,
    MacroRow,
    Chip,
    Button,
    Badge,
    Icon
  } = window.AkeliNutritionApp_cbe5c2;
  function RecipeDetailScreen({
    recipe = {},
    onBack
  }) {
    const dimg = recipe.image || '../../assets/sample/dish-arachide.png';
    const title = recipe.title || 'Sauce arachide – riz blanc';
    const tags = recipe.region ? ['Repas familiaux', 'Riche en fibres', recipe.region] : ['Repas familiaux', 'Riche en fibres', 'Prise de muscle'];
    const ingredients = [{
      qty: '500 g',
      name: 'Poulet'
    }, {
      qty: '3',
      name: 'Tomates fraîches'
    }, {
      qty: '3',
      name: 'Oignons'
    }, {
      qty: '2',
      name: 'Piment frais'
    }, {
      qty: '10 g',
      name: 'Tomate concentrée'
    }, {
      qty: '250 g',
      name: 'Pâte d\'arachide'
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        paddingBottom: 24
      }
    }, /*#__PURE__*/React.createElement(GlassHeader, {
      showBack: true,
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 24px 0'
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: 0,
        fontFamily: 'var(--akeli-font-display)',
        fontSize: 26,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: 'var(--akeli-primary)',
        lineHeight: 1.15,
        textTransform: 'uppercase'
      }
    }, title)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '18px 20px 0'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: dimg,
      alt: "",
      style: {
        width: '100%',
        height: 220,
        objectFit: 'cover',
        borderRadius: 'var(--akeli-radius-xl)',
        display: 'block'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '18px 20px 0'
      }
    }, /*#__PURE__*/React.createElement(MacroRow, {
      calories: recipe.calories ? recipe.calories * 3 : 520,
      protein: 32,
      carbs: 60,
      fat: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: '18px 20px 0',
        color: 'var(--akeli-on-surface-variant)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 14,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "schedule",
      size: 18,
      color: "var(--akeli-outline)"
    }), " ", recipe.minutes || 30, " min"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, "Difficult\xE9 ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--akeli-on-surface)'
      }
    }, "Mod\xE9r\xE9"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 9,
        justifyContent: 'center',
        padding: '18px 24px 0'
      }
    }, tags.map((t, i) => /*#__PURE__*/React.createElement(Chip, {
      key: i,
      variant: "editorial"
    }, t))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '24px 24px 0'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '0 0 8px',
        fontFamily: 'var(--akeli-font-display)',
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--akeli-on-surface)'
      }
    }, "Description"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--akeli-font-body)',
        fontSize: 14,
        lineHeight: 1.6,
        color: 'var(--akeli-on-surface-variant)'
      }
    }, "Votre plat, repens\xE9 et fait pour vous. Le go\xFBt de chez vous reste entier \u2014 mangez \xE0 votre faim, \xE0 votre rythme.")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '22px 24px 0'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '0 0 12px',
        fontFamily: 'var(--akeli-font-display)',
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--akeli-secondary)'
      }
    }, "Ingr\xE9dients"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, ingredients.map((ing, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--akeli-surface)',
        borderRadius: 'var(--akeli-radius-md)',
        padding: '13px 16px',
        boxShadow: '0 2px 8px rgba(27,28,22,0.03)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--akeli-font-display)',
        fontSize: 15,
        fontWeight: 800,
        color: 'var(--akeli-secondary)',
        minWidth: 52
      }
    }, ing.qty), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--akeli-font-body)',
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--akeli-on-surface)'
      }
    }, ing.name))))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '24px 24px 8px'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      fullWidth: true,
      trailingIcon: "calendar_add_on"
    }, "Ajouter au calendrier")));
  }
  window.RecipeDetailScreen = RecipeDetailScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/RecipeDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/RecipesScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const RIMG = '../../assets/sample/';
  const {
    SearchInput,
    Chip,
    RecipeCard,
    GlassHeader
  } = window.AkeliNutritionApp_cbe5c2;
  const FILTERS = ['Tout', 'Repas familiaux', 'Riche en protéine', 'Prise de muscle', 'Faible calories'];
  const ALL_RECIPES = [{
    title: 'Sauce arachide – riz blanc',
    image: RIMG + 'dish-arachide.png',
    minutes: 30,
    calories: 180,
    protein: 9,
    difficulty: 'medium',
    rating: 4.6,
    ratingCount: 128,
    likeCount: 42,
    liked: true,
    region: 'Afrique de l\'Ouest'
  }, {
    title: 'Sauce gouagouassou – foutou',
    image: RIMG + 'dish-gouagouassou.png',
    minutes: 45,
    calories: 210,
    protein: 12,
    difficulty: 'hard',
    rating: 4.8,
    ratingCount: 76,
    likeCount: 31,
    region: 'Afrique de l\'Ouest'
  }, {
    title: 'Œuf mollet – pain complet',
    image: RIMG + 'dish-oeuf.png',
    minutes: 25,
    calories: 150,
    protein: 8,
    difficulty: 'easy',
    rating: 4.4,
    ratingCount: 54,
    likeCount: 18,
    region: 'Petit-déjeuner'
  }, {
    title: 'Mafé de bœuf',
    image: RIMG + 'dish-arachide.png',
    minutes: 60,
    calories: 240,
    protein: 15,
    difficulty: 'medium',
    rating: 4.7,
    ratingCount: 91,
    likeCount: 27,
    region: 'Afrique de l\'Ouest'
  }];
  function RecipesScreen({
    onOpenRecipe
  }) {
    const [q, setQ] = React.useState('');
    const [active, setActive] = React.useState(0);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(GlassHeader, {
      title: "Recette",
      center: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 20px 0',
        display: 'flex',
        gap: 10,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(SearchInput, {
      value: q,
      onChange: e => setQ(e.target.value),
      placeholder: "Rechercher votre recette",
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("button", {
      style: {
        width: 46,
        height: 46,
        borderRadius: 'var(--akeli-radius-md)',
        border: 'none',
        background: 'var(--akeli-surface-container-high)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-rounded",
      style: {
        color: 'var(--akeli-on-surface-variant)'
      }
    }, "tune"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 9,
        overflowX: 'auto',
        padding: '16px 20px 4px',
        scrollbarWidth: 'none'
      }
    }, FILTERS.map((f, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Chip, {
      active: i === active,
      onClick: () => setActive(i)
    }, f)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14,
        padding: '14px 20px 24px'
      }
    }, ALL_RECIPES.map((r, i) => /*#__PURE__*/React.createElement(RecipeCard, _extends({
      key: i
    }, r, {
      onClick: () => onOpenRecipe(r),
      onLike: () => {}
    })))));
  }
  window.RecipesScreen = RecipesScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/RecipesScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ChatBubble = __ds_scope.ChatBubble;

__ds_ns.MealCard = __ds_scope.MealCard;

__ds_ns.RecipeCard = __ds_scope.RecipeCard;

__ds_ns.ShoppingRow = __ds_scope.ShoppingRow;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.MealTypeBadge = __ds_scope.MealTypeBadge;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.MacroStat = __ds_scope.MacroStat;

__ds_ns.MacroRow = __ds_scope.MacroRow;

__ds_ns.ProgressRing = __ds_scope.ProgressRing;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.WeightStepper = __ds_scope.WeightStepper;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.BottomNav = __ds_scope.BottomNav;

__ds_ns.GlassHeader = __ds_scope.GlassHeader;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.TabBar = __ds_scope.TabBar;

})();
