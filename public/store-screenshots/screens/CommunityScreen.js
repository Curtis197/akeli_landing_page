/* Compiled from CommunityScreen.jsx (Claude Design project "Store screenshots preparation", screens/CommunityScreen.jsx) — do not edit by hand; edit the .jsx in the design project and recompile. */
(function() {
    const { GlassHeader, ChatBubble, Avatar, TabBar, Icon } = window.AkeliNutritionApp_cbe5c2;
    const SEED = [
        {
            sender: 'Awa',
            message: 'Bonjour à toutes 🌿 Vous avez essayé la sauce arachide repensée ?',
            time: '14:28'
        },
        {
            sent: true,
            message: 'Oui ! Un délice, et je mange à ma faim. Je referai ce soir.',
            time: '14:30',
            read: true
        },
        {
            sender: 'Fatou',
            message: 'Partage la recette stp 🙏',
            time: '14:31'
        },
        {
            sender: 'Awa',
            message: 'Je viens de l\'ajouter au groupe, regardez l\'onglet Recettes.',
            time: '14:32'
        }
    ];
    function CommunityScreen() {
        const [tab, setTab] = React.useState(0);
        const [msgs, setMsgs] = React.useState(SEED);
        const [draft, setDraft] = React.useState('');
        const send = ()=>{
            if (!draft.trim()) return;
            setMsgs((m)=>[
                    ...m,
                    {
                        sent: true,
                        message: draft.trim(),
                        time: 'maintenant',
                        read: false
                    }
                ]);
            setDraft('');
        };
        return /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }
        }, /*#__PURE__*/ React.createElement(GlassHeader, {
            title: "Cuisine d'ici",
            showBack: true,
            actions: /*#__PURE__*/ React.createElement(Avatar, {
                initials: "C",
                size: "sm"
            })
        }), /*#__PURE__*/ React.createElement("div", {
            style: {
                background: 'var(--akeli-surface)'
            }
        }, /*#__PURE__*/ React.createElement(TabBar, {
            tabs: [
                "Discussion",
                "Membres"
            ],
            value: tab,
            onChange: setTab
        })), tab === 0 ? /*#__PURE__*/ React.createElement(React.Fragment, null, /*#__PURE__*/ React.createElement("div", {
            style: {
                flex: 1,
                overflowY: 'auto',
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
            }
        }, msgs.map((m, i)=>/*#__PURE__*/ React.createElement(ChatBubble, {
                key: i,
                ...m
            }))), /*#__PURE__*/ React.createElement("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px 14px',
                borderTop: '1px solid rgba(27,28,22,0.05)',
                background: 'var(--akeli-surface)'
            }
        }, /*#__PURE__*/ React.createElement("div", {
            style: {
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: 'var(--akeli-surface-container-high)',
                borderRadius: 'var(--akeli-radius-pill)',
                padding: '10px 16px'
            }
        }, /*#__PURE__*/ React.createElement("input", {
            value: draft,
            onChange: (e)=>setDraft(e.target.value),
            onKeyDown: (e)=>e.key === 'Enter' && send(),
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
        })), /*#__PURE__*/ React.createElement("button", {
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
        }, /*#__PURE__*/ React.createElement(Icon, {
            name: "send",
            fill: 1,
            size: 20,
            color: "#fff"
        })))) : /*#__PURE__*/ React.createElement("div", {
            style: {
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
            }
        }, [
            'Awa Diop',
            'Fatou N.',
            'Victoire (vous)',
            'Mariam K.',
            'Céline B.'
        ].map((n, i)=>/*#__PURE__*/ React.createElement("div", {
                key: i,
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }
            }, /*#__PURE__*/ React.createElement(Avatar, {
                initials: n[0],
                size: "md",
                borderColor: i === 2 ? 'var(--akeli-accent-amber)' : undefined
            }), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("div", {
                style: {
                    fontFamily: 'var(--akeli-font-body)',
                    fontWeight: 600,
                    fontSize: 15,
                    color: 'var(--akeli-on-surface)'
                }
            }, n), /*#__PURE__*/ React.createElement("div", {
                style: {
                    fontSize: 12,
                    color: 'var(--akeli-on-surface-variant)'
                }
            }, i === 0 ? 'Créatrice · Afrique de l\'Ouest' : 'Membre'))))));
    }
    window.CommunityScreen = CommunityScreen;
})();
