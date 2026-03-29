const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

// ─── Better KPIs ────────────────────────────────────────────────

export function computeStats(workouts) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Group workouts by date
  const byDate = {};
  workouts.forEach((w) => {
    if (!byDate[w.date]) byDate[w.date] = [];
    byDate[w.date].push(w);
  });

  const workoutDates = Object.keys(byDate).sort().reverse();

  // ─── Current Streak ──────────────────────────────────────────
  let streak = 0;
  const checkDate = new Date(today);
  // Check if we worked out today; if not, start from yesterday
  if (!byDate[todayStr]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (byDate[dateStr]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // ─── This Week ────────────────────────────────────────────────
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  const mondayStr = monday.toISOString().split("T")[0];

  const thisWeekWorkouts = workouts.filter((w) => w.date >= mondayStr);
  const thisWeekDays = [...new Set(thisWeekWorkouts.map((w) => w.date))].length;

  // ─── Muscles this week ────────────────────────────────────────
  const weekMuscles = {};
  thisWeekWorkouts.forEach((w) => {
    weekMuscles[w.muscle] = (weekMuscles[w.muscle] || 0) + (w.sets || 0);
  });

  // ─── Personal Records (all time) ─────────────────────────────
  const prByExercise = {};
  workouts.forEach((w) => {
    if (w.weight > 0) {
      if (!prByExercise[w.exercise] || w.weight > prByExercise[w.exercise].weight) {
        prByExercise[w.exercise] = { weight: w.weight, date: w.date };
      }
    }
  });

  // PRs set this week
  const prsThisWeek = Object.entries(prByExercise).filter(
    ([_, pr]) => pr.date >= mondayStr
  ).length;

  // ─── Total unique exercises ───────────────────────────────────
  const uniqueExercises = [...new Set(workouts.map((w) => w.exercise))].length;

  // ─── Most trained this week ───────────────────────────────────
  const topMuscle = Object.entries(weekMuscles).sort((a, b) => b[1] - a[1])[0];

  // ─── Today's session count ────────────────────────────────────
  const todayCount = (byDate[todayStr] || []).length;

  return {
    streak,
    thisWeekDays,
    prsThisWeek,
    uniqueExercises,
    topMuscle: topMuscle ? topMuscle[0] : null,
    topMuscleSets: topMuscle ? topMuscle[1] : 0,
    todayCount,
    weekMuscles,
    totalWorkouts: workoutDates.length,
  };
}

// ─── Smart Plan Recommendation ──────────────────────────────────

export function getRecommendation(workouts, plan) {
  if (workouts.length < 3) {
    return {
      title: "Start logging!",
      message: "Log a few workouts and I'll start giving you smart recommendations based on your patterns.",
      suggestion: null,
    };
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Look at last 7 days of workouts
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const recentCutoff = sevenDaysAgo.toISOString().split("T")[0];

  const recentWorkouts = workouts.filter((w) => w.date >= recentCutoff);

  // Count sets per muscle in recent history
  const recentMuscles = {};
  MUSCLE_GROUPS.forEach((m) => (recentMuscles[m] = 0));
  recentWorkouts.forEach((w) => {
    if (recentMuscles[w.muscle] !== undefined) {
      recentMuscles[w.muscle] += w.sets || 0;
    }
  });

  // Find the most rested (least trained) muscles
  const muscleRanking = Object.entries(recentMuscles)
    .sort((a, b) => a[1] - b[1]);

  const leastTrained = muscleRanking.slice(0, 3).map(([m]) => m);
  const mostTrained = muscleRanking.slice(-2).map(([m]) => m);

  // Check what was done yesterday and today
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const yesterdayMuscles = [...new Set(
    workouts.filter((w) => w.date === yesterdayStr).map((w) => w.muscle)
  )];

  const todayMuscles = [...new Set(
    workouts.filter((w) => w.date === todayStr).map((w) => w.muscle)
  )];

  // Days since last workout
  const sortedDates = [...new Set(workouts.map((w) => w.date))].sort().reverse();
  const lastWorkoutDate = sortedDates[0];
  const daysSinceLast = lastWorkoutDate
    ? Math.floor((today.getTime() - new Date(lastWorkoutDate).getTime()) / 86400000)
    : 999;

  // Build recommendation
  let title, message;
  let suggestedMuscles = [];

  if (daysSinceLast >= 3) {
    title = "Welcome back!";
    message = `It's been ${daysSinceLast} days since your last workout. Ease back in with a full-body session or pick your favorite muscle group.`;
    suggestedMuscles = ["Chest", "Back", "Legs"];
  } else if (yesterdayMuscles.length > 0) {
    const avoidMuscles = new Set([...yesterdayMuscles, ...todayMuscles]);
    suggestedMuscles = leastTrained.filter((m) => !avoidMuscles.has(m));

    if (suggestedMuscles.length === 0) {
      suggestedMuscles = MUSCLE_GROUPS.filter((m) => !avoidMuscles.has(m)).slice(0, 3);
    }

    if (yesterdayMuscles.length === 1) {
      title = `${yesterdayMuscles[0]} was yesterday`;
      message = `You hit ${yesterdayMuscles[0].toLowerCase()} yesterday. Today, focus on ${suggestedMuscles.join(" or ")} for balanced recovery.`;
    } else {
      title = "Smart rotation";
      message = `You trained ${yesterdayMuscles.join(" & ").toLowerCase()} recently. Give those a rest — today try ${suggestedMuscles.join(" or ")}.`;
    }
  } else {
    suggestedMuscles = leastTrained;
    title = "Least trained this week";
    message = `${suggestedMuscles.join(", ")} could use more attention — they've had the fewest sets this week.`;
  }

  // Build suggested exercises from history for those muscles
  const suggestedExercises = [];
  suggestedMuscles.forEach((muscle) => {
    const muscleExercises = [...new Set(
      workouts.filter((w) => w.muscle === muscle).map((w) => w.exercise)
    )];
    muscleExercises.slice(0, 2).forEach((ex) => {
      suggestedExercises.push({ exercise: ex, muscle });
    });
  });

  return {
    title,
    message,
    suggestedMuscles,
    suggestedExercises,
    recentMuscles,
  };
}
