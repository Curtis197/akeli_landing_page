"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "next-intl";

interface Ingredient {
  name: string;
  name_fr: string;
  quantity: number;
  unit: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  ingredients: Ingredient[];
}

interface OnboardingRecipes {
  breakfast: Recipe | null;
  lunch: Recipe | null;
  dinner: Recipe | null;
}

const REGIONS = [
  { code: "west_africa", name_fr: "Afrique de l'Ouest", name_en: "West Africa", desc_fr: "Jollof Rice, Mafé, Yassa...", desc_en: "Jollof Rice, Mafe, Yassa..." },
  { code: "north_africa", name_fr: "Afrique du Nord / Maghreb", name_en: "North Africa", desc_fr: "Couscous, Tajine, Lablabi...", desc_en: "Couscous, Tajine, Lablabi..." },
  { code: "central_africa", name_fr: "Afrique Centrale", name_en: "Central Africa", desc_fr: "Ndolé, Poisson Liboke, Kanda...", desc_en: "Ndole, Liboke Fish, Kanda..." },
  { code: "east_africa", name_fr: "Afrique de l'Est", name_en: "East Africa", desc_fr: "Ugali, Sukuma Wiki, Mutura...", desc_en: "Ugali, Sukuma Wiki, Mutura..." },
  { code: "southern_africa", name_fr: "Afrique Australe", name_en: "Southern Africa", desc_fr: "Pap, Chakalaka, Biltong Soup...", desc_en: "Pap, Chakalaka, Biltong Soup..." },
  { code: "caribbean", name_fr: "Caraïbes", name_en: "Caribbean", desc_fr: "Colombo, Accras, Caldeirada...", desc_en: "Colombo, Accras, Caldeirada..." },
  { code: "indian_ocean", name_fr: "Océan Indien", name_en: "Indian Ocean", desc_fr: "Romazava, Rougail Saucisse...", desc_en: "Romazava, Sausage Rougail..." },
  { code: "occidental", name_fr: "Occident", name_en: "Occidental / Western", desc_fr: "Gratins, Rôtis, Plats locaux...", desc_en: "Gratins, Roasts, Western classics..." }
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: "Bilan Nutritionnel Akeli",
    subtitle: "Découvrez vos portions de recettes idéales pour atteindre vos objectifs sans abandonner vos saveurs culturelles.",
    step1_title: "Sélectionnez votre région culinaire",
    step1_desc: "Akeli adapte vos plats préférés sans en altérer les saveurs authentiques.",
    step2_title: "Votre objectif & activité",
    step2_desc: "Ces paramètres guident le calcul de vos dépenses énergétiques.",
    step3_title: "Vos données corporelles",
    step3_desc: "Des informations précises pour un bilan métabolique sur-mesure.",
    step4_loading: "Calcul métabolique en cours...",
    step4_bmr: "Analyse de votre métabolisme de base (BMR)...",
    step4_tdee: "Calcul de vos dépenses journalières (TDEE)...",
    step4_recipes: "Ajustement des portions de recettes...",
    results_title: "Votre Profil Nutritionnel",
    results_desc: "Akeli ajuste automatiquement vos recettes. Utilisez le curseur ci-dessous pour modifier vos calories.",
    calorie_slider: "Ajuster l'apport calorique quotidien :",
    macros_repartition: "Répartition des Macronutriments",
    protein: "Protéines",
    carbs: "Glucides",
    fat: "Lipides",
    sample_day: "Votre Journée de Recettes Adaptées",
    breakfast: "Petit Déjeuner",
    lunch: "Déjeuner",
    dinner: "Dîner",
    ingredients: "Ingrédients requis",
    email_title: "Recevoir mon bilan par e-mail",
    email_desc: "Entrez votre adresse pour enregistrer votre profil et recevoir votre menu adapté avec la liste de courses.",
    email_placeholder: "Votre adresse e-mail...",
    email_submit: "M'envoyer mes résultats",
    email_success: "Résultats envoyés ! Vérifiez votre boîte de réception.",
    btn_next: "Suivant",
    btn_prev: "Retour",
    btn_finish: "Calculer mon profil",
    goal_loss: "Perdre du poids",
    goal_maintenance: "Maintenir mon poids & manger sainement",
    goal_gain: "Prendre du muscle",
    act_sedentary: "Sédentaire (Activité faible)",
    act_light: "Activité légère (1-3 séances / semaine)",
    act_moderate: "Activité modérée (3-5 séances / semaine)",
    act_active: "Actif (Entraînements quasi-quotidiens)",
    act_very_active: "Très actif (Métier physique / double entraînement)",
    gender_male: "Homme",
    gender_female: "Femme",
    gender_other: "Autre",
    label_age: "Âge",
    label_height: "Taille (cm)",
    label_weight: "Poids actuel (kg)",
    label_target_weight: "Poids cible (kg)",
    label_target_weeks: "Durée estimée (semaines)",
    error_fields: "Veuillez remplir correctement tous les champs.",
    error_email: "Veuillez entrer un e-mail valide."
  },
  en: {
    title: "Akeli Nutrition Assessment",
    subtitle: "Discover your ideal recipe portions to reach your goals without losing your cultural flavors.",
    step1_title: "Select your culinary region",
    step1_desc: "Akeli scales your favorite dishes without altering their authentic taste.",
    step2_title: "Your goal & activity level",
    step2_desc: "These parameters guide the calculation of your energy expenditure.",
    step3_title: "Your physical profile",
    step3_desc: "Accurate information for a tailored metabolic report.",
    step4_loading: "Calculating your metabolism...",
    step4_bmr: "Analyzing your Basal Metabolic Rate (BMR)...",
    step4_tdee: "Computing your Daily Energy Expenditure (TDEE)...",
    step4_recipes: "Scaling recipe portions...",
    results_title: "Your Nutrition Profile",
    results_desc: "Akeli automatically adapts your recipes. Use the slider below to tweak your calories.",
    calorie_slider: "Adjust daily calorie intake:",
    macros_repartition: "Macronutrient Ratios",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    sample_day: "Your Adapted Day of Recipes",
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    ingredients: "Required ingredients",
    email_title: "Receive your report by email",
    email_desc: "Enter your email to save your profile and receive your custom menu with the shopping list.",
    email_placeholder: "Your email address...",
    email_submit: "Email my results",
    email_success: "Results sent! Check your inbox.",
    btn_next: "Next",
    btn_prev: "Back",
    btn_finish: "Calculate my profile",
    goal_loss: "Lose weight",
    goal_maintenance: "Maintain weight & eat healthy",
    goal_gain: "Build muscle",
    act_sedentary: "Sedentary (Little to no activity)",
    act_light: "Light activity (1-3 sessions / week)",
    act_moderate: "Moderate activity (3-5 sessions / week)",
    act_active: "Active (Almost daily workouts)",
    act_very_active: "Very active (Physical job / double workouts)",
    gender_male: "Male",
    gender_female: "Female",
    gender_other: "Other",
    label_age: "Age",
    label_height: "Height (cm)",
    label_weight: "Current Weight (kg)",
    label_target_weight: "Target Weight (kg)",
    label_target_weeks: "Target duration (weeks)",
    error_fields: "Please fill out all fields correctly.",
    error_email: "Please enter a valid email."
  }
};

export default function TestOnboarding() {
  const locale = useLocale();
  const t = TRANSLATIONS[locale] || TRANSLATIONS.fr;

  const [step, setStep] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState("west_africa");
  
  // Goal & Activity
  const [goal, setGoal] = useState<"weight_loss" | "maintenance" | "muscle_gain">("maintenance");
  const [activity, setActivity] = useState<"sedentary" | "light" | "moderate" | "active" | "very_active">("moderate");
  
  // Physical Metrics
  const [sex, setSex] = useState<"male" | "female" | "other">("female");
  const [age, setAge] = useState<number>(28);
  const [height, setHeight] = useState<number>(168);
  const [weight, setWeight] = useState<number>(68);
  const [targetWeight, setTargetWeight] = useState<number>(60);
  const [remainingWeeks, setRemainingWeeks] = useState<number>(12);
  
  // Processing Animation
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  
  // Calculations & Results
  const [baseTargets, setBaseTargets] = useState<{
    bmr: number;
    tdee: number;
    calorie_goal: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
  } | null>(null);

  const [sliderCalories, setSliderCalories] = useState<number>(2000);
  const [recipes, setRecipes] = useState<OnboardingRecipes>({ breakfast: null, lunch: null, dinner: null });
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  
  // Lead Capture
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [uiError, setUiError] = useState("");

  // Loading text cycles
  useEffect(() => {
    if (step === 4) {
      const texts = [t.step4_bmr, t.step4_tdee, t.step4_recipes];
      const timer = setInterval(() => {
        setLoadingTextIndex(prev => {
          if (prev < texts.length - 1) {
            return prev + 1;
          } else {
            clearInterval(timer);
            // Finished calculations -> Fetch recipes and transit
            fetchRecipesAndCalculate();
            return prev;
          }
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  // Client-side biological calculation replica of the SQL function
  const runLocalAssessment = () => {
    let computedBmr = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
    
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    let computedTdee = computedBmr * (multipliers[activity] || 1.2);

    const goal_c = goal;
    const target = goal_c === "maintenance" ? weight : targetWeight;
    const delta_c = target - weight;
    
    let pace_c = 0.5; // default 0.5 kg/week
    if (goal_c === "weight_loss") {
      pace_c = delta_c >= 0 ? 0 : 0.5;
      if (remainingWeeks) {
        pace_c = Math.min(Math.abs(delta_c) / Math.max(remainingWeeks, 1), 1.0);
      }
    } else if (goal_c === "muscle_gain") {
      pace_c = delta_c <= 0 ? 0 : 0.25;
      if (remainingWeeks) {
        pace_c = Math.min(Math.abs(delta_c) / Math.max(remainingWeeks, 1), 0.5);
      }
    }

    let calories = computedTdee;
    if (goal_c === "weight_loss") {
      calories = Math.max(computedTdee - pace_c * 1100, computedBmr);
    } else if (goal_c === "muscle_gain") {
      calories = computedTdee + Math.min(pace_c * 1100, 0.20 * computedTdee);
    }

    // Macros Ratios
    // Protein g/kg based on muscle goal (gain = 2.2, loss = 1.2, maint = 1.6)
    const muscleGoal = goal_c === "muscle_gain" ? "gain" : (goal_c === "weight_loss" ? "loss" : "maintenance");
    const proteinWeightRef = (goal_c === "weight_loss") ? Math.min(weight, target) : weight;
    const proteinMultiplier = muscleGoal === "gain" ? 2.2 : (muscleGoal === "loss" ? 1.2 : 1.6);
    let protein_g = Math.min(proteinWeightRef * proteinMultiplier, (0.35 * calories) / 4.0);
    
    // Fat % (gain = 20%, loss = 30%, maint = 25%)
    const fatPct = muscleGoal === "gain" ? 0.20 : (muscleGoal === "loss" ? 0.30 : 0.25);
    let fat_g = (fatPct * calories) / 9.0;

    // Carbs fills the remainder
    let carbs_g = (calories - protein_g * 4 - fat_g * 9) / 4.0;

    return {
      bmr: Math.round(computedBmr),
      tdee: Math.round(computedTdee),
      calorie_goal: Math.round(calories),
      protein_g: Math.round(protein_g * 10) / 10,
      carb_g: Math.round(carbs_g * 10) / 10,
      fat_g: Math.round(fat_g * 10) / 10
    };
  };

  const fetchRecipesAndCalculate = async () => {
    setLoadingRecipes(true);
    try {
      const assessment = runLocalAssessment();
      setBaseTargets(assessment);
      setSliderCalories(assessment.calorie_goal);

      const res = await fetch(`/api/onboarding-recipes?region=${selectedRegion}&protein_g=${assessment.protein_g}&carb_g=${assessment.carb_g}&fat_g=${assessment.fat_g}`);
      const payload = await res.json();

      if (payload.data) {
        setRecipes(payload.data);
      }
      setStep(5);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecipes(false);
    }
  };

  // Recalculate macro details dynamically as slider changes
  const getScaledMacros = () => {
    if (!baseTargets) return { protein: 0, carbs: 0, fat: 0 };
    
    // Keep the ratios of protein/carbs/fat constant relative to calorie changes
    const proteinRatio = (baseTargets.protein_g * 4) / baseTargets.calorie_goal;
    const fatRatio = (baseTargets.fat_g * 9) / baseTargets.calorie_goal;

    const protein_g = (proteinRatio * sliderCalories) / 4;
    const fat_g = (fatRatio * sliderCalories) / 9;
    const carbs_g = (sliderCalories - protein_g * 4 - fat_g * 9) / 4;

    return {
      protein: Math.round(protein_g),
      carbs: Math.round(carbs_g),
      fat: Math.round(fat_g)
    };
  };

  const currentMacros = getScaledMacros();

  // Scales ingredient quantity based on target meal budget vs base recipe calories
  const getScaledIngredientQuantity = (recipe: Recipe, ingredient: Ingredient, mealCalorieBudget: number) => {
    const scaleFactor = mealCalorieBudget / recipe.macros.calories;
    const scaledQty = ingredient.quantity * scaleFactor;
    return Math.round(scaledQty);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setUiError("");

    if (!email || !email.includes("@")) {
      setUiError(t.error_email);
      return;
    }

    setSubmittingLead(true);
    try {
      const res = await fetch("/api/onboarding-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          calorie_goal: sliderCalories,
          protein_g: currentMacros.protein,
          carb_g: currentMacros.carbs,
          fat_g: currentMacros.fat,
          region: selectedRegion,
          target_weight_kg: goal === "maintenance" ? null : targetWeight,
          remaining_weeks: goal === "maintenance" ? null : remainingWeeks
        })
      });

      if (res.ok) {
        setEmailSubmitted(true);
      } else {
        setUiError(t.error_fields);
      }
    } catch (err) {
      setUiError(t.error_fields);
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleNextStep = () => {
    setUiError("");
    if (step === 3) {
      if (!age || !height || !weight || (goal !== "maintenance" && (!targetWeight || !remainingWeeks))) {
        setUiError(t.error_fields);
        return;
      }
      setLoadingTextIndex(0);
      setStep(4);
    } else {
      setStep(prev => prev + 1);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}>
          {t.title}
        </h1>
        <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--color-brand-forest)" }}>
          {t.subtitle}
        </p>
      </div>

      {/* Wizard Card */}
      <div className="rounded-3xl shadow-xl p-8 sm:p-12 border transition-all duration-300"
        style={{ backgroundColor: "rgba(247,242,234,0.8)", backdropFilter: "blur(12px)", borderColor: "rgba(28,43,28,0.08)" }}>
        
        {/* Step Indicator */}
        {step <= 3 && (
          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-brand-green)" }}>
              Étape {step} sur 3
            </span>
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-1.5 w-12 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i <= step ? "var(--color-brand-green)" : "rgba(28,43,28,0.1)" }} />
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: Region Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}>
              {t.step1_title}
            </h2>
            <p className="text-sm mb-8" style={{ color: "var(--color-brand-forest)" }}>
              {t.step1_desc}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {REGIONS.map(reg => {
                const name = locale === "en" ? reg.name_en : reg.name_fr;
                const desc = locale === "en" ? reg.desc_en : reg.desc_fr;
                const isSelected = selectedRegion === reg.code;

                return (
                  <button key={reg.code} onClick={() => setSelectedRegion(reg.code)}
                    className="flex flex-col text-left p-5 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.01]"
                    style={{
                      borderColor: isSelected ? "var(--color-brand-green)" : "rgba(28,43,28,0.1)",
                      backgroundColor: isSelected ? "rgba(59,183,143,0.06)" : "#fff",
                      boxShadow: isSelected ? "0 4px 20px rgba(59,183,143,0.1)" : "none"
                    }}>
                    <span className="font-semibold text-lg mb-1" style={{ color: "var(--color-brand-dark)" }}>
                      {name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-brand-forest)" }}>
                      {desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Goal & Activity */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}>
              {t.step2_title}
            </h2>
            <p className="text-sm mb-8" style={{ color: "var(--color-brand-forest)" }}>
              {t.step2_desc}
            </p>

            <div className="mb-8">
              <label className="block text-sm font-semibold mb-3" style={{ color: "var(--color-brand-dark)" }}>
                Mon objectif principal :
              </label>
              <div className="flex flex-col gap-3">
                {([
                  { code: "weight_loss", text: t.goal_loss },
                  { code: "maintenance", text: t.goal_maintenance },
                  { code: "muscle_gain", text: t.goal_gain }
                ] as const).map(item => (
                  <button key={item.code} onClick={() => setGoal(item.code)}
                    className="text-left p-4 rounded-xl border transition-all"
                    style={{
                      borderColor: goal === item.code ? "var(--color-brand-green)" : "rgba(28,43,28,0.1)",
                      backgroundColor: goal === item.code ? "rgba(59,183,143,0.06)" : "#fff",
                      fontWeight: goal === item.code ? "600" : "normal"
                    }}>
                    {item.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold mb-3" style={{ color: "var(--color-brand-dark)" }}>
                Mon niveau d'activité :
              </label>
              <div className="flex flex-col gap-3">
                {([
                  { code: "sedentary", text: t.act_sedentary },
                  { code: "light", text: t.act_light },
                  { code: "moderate", text: t.act_moderate },
                  { code: "active", text: t.act_active },
                  { code: "very_active", text: t.act_very_active }
                ] as const).map(item => (
                  <button key={item.code} onClick={() => setActivity(item.code)}
                    className="text-left p-4 rounded-xl border transition-all"
                    style={{
                      borderColor: activity === item.code ? "var(--color-brand-green)" : "rgba(28,43,28,0.1)",
                      backgroundColor: activity === item.code ? "rgba(59,183,143,0.06)" : "#fff",
                      fontWeight: activity === item.code ? "600" : "normal"
                    }}>
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Physical Metrics */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}>
              {t.step3_title}
            </h2>
            <p className="text-sm mb-8" style={{ color: "var(--color-brand-forest)" }}>
              {t.step3_desc}
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-brand-dark)" }}>
                  Sexe biologique :
                </label>
                <div className="flex gap-2">
                  {([
                    { code: "female", text: t.gender_female },
                    { code: "male", text: t.gender_male },
                    { code: "other", text: t.gender_other }
                  ] as const).map(item => (
                    <button key={item.code} type="button" onClick={() => setSex(item.code)}
                      className="flex-1 py-3 text-sm rounded-xl border font-medium text-center transition-all"
                      style={{
                        borderColor: sex === item.code ? "var(--color-brand-green)" : "rgba(28,43,28,0.1)",
                        backgroundColor: sex === item.code ? "rgba(59,183,143,0.06)" : "#fff"
                      }}>
                      {item.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-brand-dark)" }}>
                  {t.label_age} :
                </label>
                <input type="number" min="18" max="100" value={age || ""} onChange={e => setAge(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#3bb78f] text-black" />
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-brand-dark)" }}>
                  {t.label_height} :
                </label>
                <input type="number" min="100" max="250" value={height || ""} onChange={e => setHeight(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#3bb78f] text-black" />
              </div>

              {/* Current Weight */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-brand-dark)" }}>
                  {t.label_weight} :
                </label>
                <input type="number" min="30" max="300" value={weight || ""} onChange={e => setWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#3bb78f] text-black" />
              </div>

              {/* Target Weight & Time duration (if loss/gain) */}
              {goal !== "maintenance" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-brand-dark)" }}>
                      {t.label_target_weight} :
                    </label>
                    <input type="number" min="30" max="300" value={targetWeight || ""} onChange={e => setTargetWeight(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#3bb78f] text-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-brand-dark)" }}>
                      {t.label_target_weeks} :
                    </label>
                    <input type="number" min="1" max="100" value={remainingWeeks || ""} onChange={e => setRemainingWeeks(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#3bb78f] text-black" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Processing / Loading */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-8 w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}>
              {t.step4_loading}
            </h2>
            
            <p className="text-sm font-medium animate-fade" style={{ color: "var(--color-brand-forest)" }}>
              {loadingTextIndex === 0 && t.step4_bmr}
              {loadingTextIndex === 1 && t.step4_tdee}
              {loadingTextIndex === 2 && t.step4_recipes}
            </p>
          </div>
        )}

        {/* STEP 5: Results Dashboard */}
        {step === 5 && baseTargets && (
          <div className="animate-fadeIn">
            {/* Dashboard Headers */}
            <div className="text-center mb-8 border-b pb-6" style={{ borderColor: "rgba(28,43,28,0.1)" }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-brand-green)" }}>
                Votre Analyse Nutritionnelle
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}>
                {t.results_title}
              </h2>
              <p className="text-sm max-w-xl mx-auto" style={{ color: "var(--color-brand-forest)" }}>
                {t.results_desc}
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-8 mb-10">
              {/* Left Column: Calories Target & Slider (2 cols) */}
              <div className="md:col-span-2 flex flex-col justify-center p-6 rounded-2xl bg-white border border-black/5">
                <div className="text-center mb-6">
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Cible Quotidienne</span>
                  <div className="text-5xl font-extrabold mt-1 text-[#9c88ff]" style={{ fontFamily: "var(--font-display)" }}>
                    {sliderCalories} <span className="text-lg font-semibold">kcal</span>
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {t.calorie_slider}
                  </label>
                  <input type="range" min={Math.max(1200, baseTargets.calorie_goal - 600)} max={Math.min(4500, baseTargets.calorie_goal + 600)}
                    value={sliderCalories} onChange={e => setSliderCalories(Number(e.target.value))}
                    className="w-full h-2 rounded-lg bg-gray-200 cursor-pointer accent-[#9c88ff]" />
                  <div className="flex justify-between text-xxs font-semibold text-gray-400 mt-1">
                    <span>{Math.max(1200, baseTargets.calorie_goal - 600)} kcal</span>
                    <span>{Math.min(4500, baseTargets.calorie_goal + 600)} kcal</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Macro repartition (3 cols) */}
              <div className="md:col-span-3 p-6 rounded-2xl bg-white border border-black/5 flex flex-col justify-between">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                  {t.macros_repartition}
                </h3>

                <div className="space-y-4">
                  {/* Protein */}
                  <div>
                    <div className="flex justify-between text-sm font-semibold mb-1" style={{ color: "var(--color-brand-dark)" }}>
                      <span>{t.protein} (4 kcal/g)</span>
                      <span>{currentMacros.protein}g</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full transition-all duration-300"
                        style={{ width: `${((currentMacros.protein * 4) / sliderCalories) * 100}%` }} />
                    </div>
                  </div>

                  {/* Carbs */}
                  <div>
                    <div className="flex justify-between text-sm font-semibold mb-1" style={{ color: "var(--color-brand-dark)" }}>
                      <span>{t.carbs} (4 kcal/g)</span>
                      <span>{currentMacros.carbs}g</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${((currentMacros.carbs * 4) / sliderCalories) * 100}%` }} />
                    </div>
                  </div>

                  {/* Fat */}
                  <div>
                    <div className="flex justify-between text-sm font-semibold mb-1" style={{ color: "var(--color-brand-dark)" }}>
                      <span>{t.fat} (9 kcal/g)</span>
                      <span>{currentMacros.fat}g</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${((currentMacros.fat * 9) / sliderCalories) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipes Sample Section */}
            <div className="mb-10">
              <h3 className="text-xl sm:text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}>
                {t.sample_day}
              </h3>

              <div className="flex flex-col gap-6">
                {(["breakfast", "lunch", "dinner"] as const).map(mealKey => {
                  const recipe = recipes[mealKey];
                  if (!recipe) return null;

                  const mealName = t[mealKey];
                  const budgetPercent = mealKey === "breakfast" ? 0.25 : (mealKey === "lunch" ? 0.35 : 0.30);
                  const mealCalBudget = Math.round(sliderCalories * budgetPercent);
                  
                  // Compute scale factor
                  const scaleFactor = mealCalBudget / recipe.macros.calories;
                  const isExpanded = expandedRecipe === mealKey;

                  return (
                    <div key={recipe.id} className="rounded-2xl border overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
                      style={{ borderColor: "rgba(28,43,28,0.06)" }}>
                      <div className="flex flex-col sm:flex-row">
                        {/* cover image */}
                        <div className="relative w-full sm:w-48 h-36 bg-gray-100 flex-shrink-0">
                          {recipe.cover_image_url ? (
                            <img src={recipe.cover_image_url} alt={recipe.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 text-xs">
                              No Cover
                            </div>
                          )}
                          <div className="absolute top-2 left-2 px-2.5 py-1 text-2xs font-extrabold uppercase rounded-lg text-white bg-black/60 backdrop-blur-sm">
                            {mealName}
                          </div>
                        </div>

                        {/* main details */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-lg text-gray-800 leading-tight">
                                {recipe.title}
                              </h4>
                              <span className="text-sm font-extrabold text-[#3bb78f]">
                                {mealCalBudget} kcal
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3 uppercase font-semibold">
                              Portion : {Math.round(scaleFactor * 100)}% de la recette de base
                            </p>
                            {recipe.description && (
                              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                {recipe.description}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center mt-4">
                            <div className="flex gap-4 text-xxs font-semibold text-gray-500">
                              <span>P: {Math.round(recipe.macros.protein_g * scaleFactor)}g</span>
                              <span>G: {Math.round(recipe.macros.carbs_g * scaleFactor)}g</span>
                              <span>L: {Math.round(recipe.macros.fat_g * scaleFactor)}g</span>
                            </div>

                            <button onClick={() => setExpandedRecipe(isExpanded ? null : mealKey)}
                              className="text-xs font-bold transition-all text-[#3bb78f] hover:underline flex items-center gap-1">
                              {t.ingredients}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                                className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                                <path d="M19 9l-7 7-7-7"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Ingredients */}
                      {isExpanded && (
                        <div className="px-6 py-5 bg-[#fbfaf8] border-t border-gray-100">
                          <ul className="grid sm:grid-cols-2 gap-3 text-xs text-gray-600">
                            {recipe.ingredients.map((ing, idx) => {
                              const qty = getScaledIngredientQuantity(recipe, ing, mealCalBudget);
                              const name = locale === "en" ? ing.name : ing.name_fr;
                              return (
                                <li key={idx} className="flex justify-between py-1 border-b border-black/5">
                                  <span className="font-medium text-gray-700">{name}</span>
                                  <span className="font-bold text-[#9c88ff]">{qty} {ing.unit}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lead capture Card */}
            <div className="rounded-2xl p-6 sm:p-8 text-center text-white relative overflow-hidden"
              style={{ backgroundColor: "var(--color-brand-dark)" }}>
              <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full opacity-10 bg-emerald-500" />
              <div className="relative">
                <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  {t.email_title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 max-w-md mx-auto mb-6">
                  {t.email_desc}
                </p>

                {emailSubmitted ? (
                  <div className="py-4 text-[#3bb78f] font-bold text-lg flex items-center justify-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    {t.email_success}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitLead} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2">
                    <input type="email" placeholder={t.email_placeholder} value={email} onChange={e => setEmail(e.target.value)}
                      className="flex-grow px-4 py-3.5 rounded-xl text-black focus:outline-none placeholder-gray-400 text-sm" />
                    
                    <button type="submit" disabled={submittingLead}
                      className="px-6 py-3.5 rounded-xl font-bold text-sm bg-[#3bb78f] hover:bg-[#329e7b] transition-all hover:scale-[1.01]">
                      {submittingLead ? "..." : t.email_submit}
                    </button>
                  </form>
                )}

                {uiError && <p className="text-xs text-red-400 font-bold mt-2">{uiError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        {step <= 3 && (
          <div className="flex justify-between items-center mt-10 border-t pt-6" style={{ borderColor: "rgba(28,43,28,0.1)" }}>
            <button onClick={() => setStep(prev => Math.max(1, prev - 1))} disabled={step === 1}
              className="px-6 py-3 rounded-xl border border-[#1c2b1c] text-sm font-semibold transition-all hover:bg-black/5 disabled:opacity-20">
              {t.btn_prev}
            </button>

            <button onClick={handleNextStep}
              className="px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{ backgroundColor: "var(--color-brand-green)" }}>
              {step === 3 ? t.btn_finish : t.btn_next}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
