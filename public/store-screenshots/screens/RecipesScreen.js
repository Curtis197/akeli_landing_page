/* Compiled from RecipesScreen.jsx (Claude Design project "Store screenshots preparation", screens/RecipesScreen.jsx) — do not edit by hand; edit the .jsx in the design project and recompile. */
(function() {
    const RIMG = 'assets/sample/';
    const { SearchInput, Chip, RecipeCard, GlassHeader } = window.AkeliNutritionApp_cbe5c2;
    const FILTERS = [
        'Tout',
        'Repas familiaux',
        'Riche en protéine',
        'Prise de muscle',
        'Faible calories'
    ];
    const ALL_RECIPES = [
        {
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
        },
        {
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
        },
        {
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
        },
        {
            title: 'Mafé de bœuf',
            image: RIMG + 'mafe.jpg',
            minutes: 60,
            calories: 240,
            protein: 15,
            difficulty: 'medium',
            rating: 4.7,
            ratingCount: 91,
            likeCount: 27,
            region: 'Afrique de l\'Ouest'
        }
    ];
    function RecipesScreen({ onOpenRecipe }) {
        const [q, setQ] = React.useState('');
        const [active, setActive] = React.useState(0);
        return /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(GlassHeader, {
            title: "Recette",
            center: true
        }), /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '4px 20px 0',
                display: 'flex',
                gap: 10,
                alignItems: 'center'
            }
        }, /*#__PURE__*/ React.createElement(SearchInput, {
            value: q,
            onChange: (e)=>setQ(e.target.value),
            placeholder: "Rechercher votre recette",
            style: {
                flex: 1
            }
        }), /*#__PURE__*/ React.createElement("button", {
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
        }, /*#__PURE__*/ React.createElement("span", {
            className: "material-symbols-rounded",
            style: {
                color: 'var(--akeli-on-surface-variant)'
            }
        }, "tune"))), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                gap: 9,
                overflowX: 'auto',
                padding: '16px 20px 4px',
                scrollbarWidth: 'none'
            }
        }, FILTERS.map((f, i)=>/*#__PURE__*/ React.createElement("div", {
                key: i,
                style: {
                    flexShrink: 0
                }
            }, /*#__PURE__*/ React.createElement(Chip, {
                active: i === active,
                onClick: ()=>setActive(i)
            }, f)))), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                padding: '14px 20px 24px'
            }
        }, ALL_RECIPES.map((r, i)=>/*#__PURE__*/ React.createElement(RecipeCard, {
                key: i,
                ...r,
                onClick: ()=>onOpenRecipe(r),
                onLike: ()=>{}
            }))));
    }
    window.RecipesScreen = RecipesScreen;
})();
