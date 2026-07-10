/* Compiled from HomeScreen.jsx (Claude Design project "Store screenshots preparation", screens/HomeScreen.jsx) — do not edit by hand; edit the .jsx in the design project and recompile. */
(function() {
    const IMG = 'assets/sample/';
    const { ProgressRing, WeightStepper, SectionHeader, MealCard, RecipeCard, Avatar, IconButton } = window.AkeliNutritionApp_cbe5c2;
    const HOME_MEALS = [
        {
            title: 'Œuf mollet – pain complet',
            mealType: 'breakfast',
            calories: 400,
            image: IMG + 'dish-oeuf.png',
            duration: 25
        },
        {
            title: 'Sauce arachide – riz blanc',
            mealType: 'lunch',
            calories: 520,
            image: IMG + 'dish-arachide.png',
            duration: 30
        },
        {
            title: 'Sauce gouagouassou – foutou',
            mealType: 'dinner',
            calories: 640,
            image: IMG + 'dish-gouagouassou.png',
            duration: 45
        }
    ];
    const HOME_RECIPES = [
        {
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
        },
        {
            title: 'Sauce gouagouassou – foutou',
            image: IMG + 'dish-gouagouassou.png',
            minutes: 45,
            calories: 210,
            protein: 12,
            difficulty: 'hard',
            rating: 4.8,
            ratingCount: 76,
            likeCount: 31
        }
    ];
    function HomeScreen({ onOpenRecipe }) {
        const [weight, setWeight] = React.useState(72.5);
        const [consumed, setConsumed] = React.useState({
            0: true
        });
        return /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px 0'
            }
        }, /*#__PURE__*/ React.createElement(Avatar, {
            initials: "V",
            size: "sm"
        }), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                gap: 2
            }
        }, /*#__PURE__*/ React.createElement(IconButton, {
            icon: "notifications",
            badge: true
        }), /*#__PURE__*/ React.createElement(IconButton, {
            icon: "settings"
        }))), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '8px 20px 4px'
            }
        }, /*#__PURE__*/ React.createElement("div", {
            style: {
                fontFamily: 'var(--akeli-font-body)',
                fontSize: 13,
                color: 'var(--akeli-on-surface-variant)'
            }
        }, "Bonjour,"), /*#__PURE__*/ React.createElement("h1", {
            style: {
                margin: '2px 0 0',
                fontFamily: 'var(--akeli-font-display)',
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--akeli-on-surface)'
            }
        }, "Eva")), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                justifyContent: 'space-around',
                padding: '18px 12px 8px'
            }
        }, /*#__PURE__*/ React.createElement(ProgressRing, {
            progress: 0.6,
            value: "6.0 %",
            label: "Suivi du poids",
            size: 104
        }), /*#__PURE__*/ React.createElement(ProgressRing, {
            progress: 0.42,
            value: "670",
            unit: "kcal",
            label: "Aujourd'hui",
            size: 104,
            from: "color-mix(in srgb, var(--akeli-secondary) 35%, transparent)",
            to: "var(--akeli-secondary)"
        })), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '10px 20px 4px'
            }
        }, /*#__PURE__*/ React.createElement("div", {
            style: {
                textAlign: 'center',
                fontFamily: 'var(--akeli-font-display)',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--akeli-on-surface)',
                marginBottom: 12
            }
        }, "Mettre à jour son poids"), /*#__PURE__*/ React.createElement(WeightStepper, {
            value: weight,
            unit: "kg",
            onChange: setWeight
        })), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '20px 20px 0'
            }
        }, /*#__PURE__*/ React.createElement(SectionHeader, {
            title: "Vos repas du jour",
            trailingLabel: "Voir tout"
        })), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                gap: 14,
                overflowX: 'auto',
                padding: '14px 20px 4px',
                scrollbarWidth: 'none'
            }
        }, HOME_MEALS.map((m, i)=>/*#__PURE__*/ React.createElement("div", {
                key: i,
                style: {
                    flexShrink: 0
                }
            }, /*#__PURE__*/ React.createElement(MealCard, {
                ...m,
                width: 220,
                consumed: !!consumed[i],
                onToggle: ()=>setConsumed((c)=>({
                            ...c,
                            [i]: !c[i]
                        })),
                onClick: ()=>onOpenRecipe(m)
            })))), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '22px 20px 0'
            }
        }, /*#__PURE__*/ React.createElement(SectionHeader, {
            title: "Recettes pour vous",
            trailingLabel: "Voir tout"
        })), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                padding: '14px 20px 24px'
            }
        }, HOME_RECIPES.map((r, i)=>/*#__PURE__*/ React.createElement(RecipeCard, {
                key: i,
                ...r,
                onClick: ()=>onOpenRecipe(r),
                onLike: ()=>{}
            }))));
    }
    window.HomeScreen = HomeScreen;
})();
