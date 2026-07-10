/* Compiled from RecipeDetailScreen.jsx (Claude Design project "Store screenshots preparation", screens/RecipeDetailScreen.jsx) — do not edit by hand; edit the .jsx in the design project and recompile. */
(function() {
    const { GlassHeader, MacroRow, Chip, Button, Badge, Icon } = window.AkeliNutritionApp_cbe5c2;
    function RecipeDetailScreen({ recipe = {}, onBack }) {
        const dimg = recipe.image || 'assets/sample/dish-arachide.png';
        const title = recipe.title || 'Sauce arachide – riz blanc';
        const tags = recipe.region ? [
            'Repas familiaux',
            'Riche en fibres',
            recipe.region
        ] : [
            'Repas familiaux',
            'Riche en fibres',
            'Prise de muscle'
        ];
        const ingredients = [
            {
                qty: '500 g',
                name: 'Poulet'
            },
            {
                qty: '3',
                name: 'Tomates fraîches'
            },
            {
                qty: '3',
                name: 'Oignons'
            },
            {
                qty: '2',
                name: 'Piment frais'
            },
            {
                qty: '10 g',
                name: 'Tomate concentrée'
            },
            {
                qty: '250 g',
                name: 'Pâte d\'arachide'
            }
        ];
        return /*#__PURE__*/ React.createElement("div", {
            style: {
                paddingBottom: 24
            }
        }, /*#__PURE__*/ React.createElement(GlassHeader, {
            showBack: true,
            onBack: onBack
        }), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '4px 24px 0'
            }
        }, /*#__PURE__*/ React.createElement("h1", {
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
        }, title)), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '18px 20px 0'
            }
        }, /*#__PURE__*/ React.createElement("img", {
            src: dimg,
            alt: "",
            style: {
                width: '100%',
                height: 220,
                objectFit: 'cover',
                borderRadius: 'var(--akeli-radius-xl)',
                display: 'block'
            }
        })), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '18px 20px 0'
            }
        }, /*#__PURE__*/ React.createElement(MacroRow, {
            calories: recipe.calories ? recipe.calories * 3 : 520,
            protein: 32,
            carbs: 60,
            fat: 18
        })), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                padding: '18px 20px 0',
                color: 'var(--akeli-on-surface-variant)'
            }
        }, /*#__PURE__*/ React.createElement("span", {
            style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 14,
                fontWeight: 600
            }
        }, /*#__PURE__*/ React.createElement(Icon, {
            name: "schedule",
            size: 18,
            color: "var(--akeli-outline)"
        }), " ", recipe.minutes || 30, " min"), /*#__PURE__*/ React.createElement("span", {
            style: {
                fontSize: 14
            }
        }, "Difficulté ", /*#__PURE__*/ React.createElement("b", {
            style: {
                color: 'var(--akeli-on-surface)'
            }
        }, "Modéré"))), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: 9,
                justifyContent: 'center',
                padding: '18px 24px 0'
            }
        }, tags.map((t, i)=>/*#__PURE__*/ React.createElement(Chip, {
                key: i,
                variant: "editorial"
            }, t))), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '24px 24px 0'
            }
        }, /*#__PURE__*/ React.createElement("h3", {
            style: {
                margin: '0 0 8px',
                fontFamily: 'var(--akeli-font-display)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--akeli-on-surface)'
            }
        }, "Description"), /*#__PURE__*/ React.createElement("p", {
            style: {
                margin: 0,
                fontFamily: 'var(--akeli-font-body)',
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--akeli-on-surface-variant)'
            }
        }, "Votre plat, repensé et fait pour vous. Le goût de chez vous reste entier — mangez à votre faim, à votre rythme.")), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '22px 24px 0'
            }
        }, /*#__PURE__*/ React.createElement("h3", {
            style: {
                margin: '0 0 12px',
                fontFamily: 'var(--akeli-font-display)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--akeli-secondary)'
            }
        }, "Ingrédients"), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 10
            }
        }, ingredients.map((ing, i)=>/*#__PURE__*/ React.createElement("div", {
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
            }, /*#__PURE__*/ React.createElement("span", {
                style: {
                    fontFamily: 'var(--akeli-font-display)',
                    fontSize: 15,
                    fontWeight: 800,
                    color: 'var(--akeli-secondary)',
                    minWidth: 52
                }
            }, ing.qty), /*#__PURE__*/ React.createElement("span", {
                style: {
                    fontFamily: 'var(--akeli-font-body)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--akeli-on-surface)'
                }
            }, ing.name))))), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '24px 24px 8px'
            }
        }, /*#__PURE__*/ React.createElement(Button, {
            variant: "primary",
            fullWidth: true,
            trailingIcon: "calendar_add_on"
        }, "Ajouter au calendrier")));
    }
    window.RecipeDetailScreen = RecipeDetailScreen;
})();
