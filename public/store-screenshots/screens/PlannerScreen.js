/* Compiled from PlannerScreen.jsx (Claude Design project "Store screenshots preparation", screens/PlannerScreen.jsx) — do not edit by hand; edit the .jsx in the design project and recompile. */
(function() {
    const PIMG = 'assets/sample/';
    const { GlassHeader, TabBar, SectionHeader, MealCard, ShoppingRow, ProgressBar, Card } = window.AkeliNutritionApp_cbe5c2;
    const DAY_MEALS = [
        {
            title: 'Œuf mollet – pain complet',
            mealType: 'breakfast',
            calories: 400,
            image: PIMG + 'dish-oeuf.png',
            duration: 25
        },
        {
            title: 'Sauce arachide – riz blanc',
            mealType: 'lunch',
            calories: 520,
            image: PIMG + 'dish-arachide.png',
            duration: 30
        },
        {
            title: 'Sauce gouagouassou – foutou',
            mealType: 'dinner',
            calories: 640,
            image: PIMG + 'dish-gouagouassou.png',
            duration: 45
        }
    ];
    const DAYS = [
        'Lun',
        'Mar',
        'Mer',
        'Jeu',
        'Ven',
        'Sam',
        'Dim'
    ];
    function PlannerScreen({ onOpenRecipe }) {
        const [day, setDay] = React.useState(3);
        const [checked, setChecked] = React.useState({
            1: true
        });
        const shopping = [
            {
                name: 'Poulet',
                quantity: '500 g',
                price: '4,20 €'
            },
            {
                name: 'Pâte d\'arachide',
                quantity: '250 g',
                price: '1,80 €'
            },
            {
                name: 'Riz blanc',
                quantity: '500 g',
                price: '0,95 €'
            },
            {
                name: 'Oignons',
                quantity: '3',
                price: '0,60 €'
            }
        ];
        return /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(GlassHeader, {
            title: "Planning",
            center: true
        }), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                padding: '4px 20px 0',
                scrollbarWidth: 'none'
            }
        }, DAYS.map((d, i)=>/*#__PURE__*/ React.createElement("button", {
                key: i,
                onClick: ()=>setDay(i),
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
            }, d))), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '18px 20px 0'
            }
        }, /*#__PURE__*/ React.createElement(Card, {
            tone: "lowest",
            padding: 16,
            elevated: false
        }, /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8
            }
        }, /*#__PURE__*/ React.createElement("span", {
            style: {
                fontFamily: 'var(--akeli-font-body)',
                fontWeight: 700,
                fontSize: 14,
                color: 'var(--akeli-on-surface)'
            }
        }, "Jeudi 12 mars"), /*#__PURE__*/ React.createElement("span", {
            style: {
                fontFamily: 'var(--akeli-font-display)',
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--akeli-primary)'
            }
        }, "1 240 / 1 600 kcal")), /*#__PURE__*/ React.createElement(ProgressBar, {
            progress: 0.775
        }))), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '20px 20px 0'
            }
        }, /*#__PURE__*/ React.createElement(SectionHeader, {
            title: "Repas planifiés"
        })), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                padding: '14px 20px 0'
            }
        }, DAY_MEALS.map((m, i)=>/*#__PURE__*/ React.createElement(MealCard, {
                key: i,
                ...m,
                width: "100%",
                consumed: i === 0,
                onToggle: ()=>{},
                onClick: ()=>onOpenRecipe(m)
            }))), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '22px 20px 0'
            }
        }, /*#__PURE__*/ React.createElement(SectionHeader, {
            title: "Liste de courses",
            trailingLabel: "Tout cocher"
        })), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '14px 20px 24px'
            }
        }, shopping.map((s, i)=>/*#__PURE__*/ React.createElement(ShoppingRow, {
                key: i,
                ...s,
                checked: !!checked[i],
                onToggle: ()=>setChecked((c)=>({
                            ...c,
                            [i]: !c[i]
                        }))
            }))));
    }
    window.PlannerScreen = PlannerScreen;
})();
