// Builds src/data/exercises.ts and assets/exercises/* from the public-domain
// free-exercise-db (https://github.com/yuhonas/free-exercise-db, Unlicense).
// Usage: node scripts/build-exercises.mjs <path-to-exercises.json>
import fs from 'node:fs';
import path from 'node:path';

const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const root = path.resolve(import.meta.dirname, '..');
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const byId = Object.fromEntries(src.map((e) => [e.id, e]));

// [db id, slot, required equipment, kind, display name override]
// kind: c = compound, i = isolation. Order within a slot = selection priority.
const C = [
  // horizontal press
  ['Barbell_Bench_Press_-_Medium_Grip', 'chest_press', ['barbell', 'bench', 'rack'], 'c', 'Barbell Bench Press'],
  ['Dumbbell_Bench_Press', 'chest_press', ['dumbbells', 'bench'], 'c'],
  ['Machine_Bench_Press', 'chest_press', ['chestmachine'], 'c', 'Machine Chest Press'],
  ['Smith_Machine_Bench_Press', 'chest_press', ['smith', 'bench'], 'c'],
  ['Cable_Chest_Press', 'chest_press', ['cables'], 'c'],
  ['Dumbbell_Floor_Press', 'chest_press', ['dumbbells'], 'c'],
  ['Pushups', 'chest_press', [], 'c', 'Push-Up'],
  // incline press
  ['Barbell_Incline_Bench_Press_-_Medium_Grip', 'incline_press', ['barbell', 'bench', 'rack'], 'c', 'Incline Barbell Press'],
  ['Incline_Dumbbell_Press', 'incline_press', ['dumbbells', 'bench'], 'c'],
  ['Smith_Machine_Incline_Bench_Press', 'incline_press', ['smith', 'bench'], 'c'],
  ['Leverage_Incline_Chest_Press', 'incline_press', ['chestmachine'], 'c', 'Machine Incline Press'],
  ['Decline_Push-Up', 'incline_press', [], 'c', 'Feet-Elevated Push-Up'],
  // fly
  ['Cable_Crossover', 'chest_fly', ['cables'], 'i'],
  ['Dumbbell_Flyes', 'chest_fly', ['dumbbells', 'bench'], 'i', 'Dumbbell Fly'],
  ['Butterfly', 'chest_fly', ['chestmachine'], 'i', 'Pec Deck Fly'],
  ['Push-Up_Wide', 'chest_fly', [], 'c', 'Wide Push-Up'],
  // overhead press
  ['Standing_Military_Press', 'shoulder_press', ['barbell'], 'c', 'Overhead Press'],
  ['Dumbbell_Shoulder_Press', 'shoulder_press', ['dumbbells'], 'c'],
  ['Machine_Shoulder_Military_Press', 'shoulder_press', ['shouldermachine'], 'c', 'Machine Shoulder Press'],
  ['Arnold_Dumbbell_Press', 'shoulder_press', ['dumbbells'], 'c', 'Arnold Press'],
  ['Two-Arm_Kettlebell_Military_Press', 'shoulder_press', ['kettlebell'], 'c', 'Kettlebell Press'],
  ['Shoulder_Press_-_With_Bands', 'shoulder_press', ['bands'], 'c', 'Band Shoulder Press'],
  ['Handstand_Push-Ups', 'shoulder_press', [], 'c', 'Handstand Push-Up', 'advanced'],
  // lateral
  ['Side_Lateral_Raise', 'lateral', ['dumbbells'], 'i', 'Dumbbell Lateral Raise'],
  ['Cable_Seated_Lateral_Raise', 'lateral', ['cables'], 'i', 'Cable Lateral Raise'],
  ['Lateral_Raise_-_With_Bands', 'lateral', ['bands'], 'i', 'Band Lateral Raise'],
  // rear delt
  ['Face_Pull', 'rear_delt', ['cables'], 'i'],
  ['Seated_Bent-Over_Rear_Delt_Raise', 'rear_delt', ['dumbbells'], 'i', 'Rear Delt Raise'],
  ['Reverse_Machine_Flyes', 'rear_delt', ['chestmachine'], 'i', 'Reverse Pec Deck'],
  ['Band_Pull_Apart', 'rear_delt', ['bands'], 'i'],
  // triceps
  ['Triceps_Pushdown_-_Rope_Attachment', 'triceps', ['cables'], 'i', 'Rope Pushdown'],
  ['EZ-Bar_Skullcrusher', 'triceps', ['ezbar', 'bench'], 'i', 'EZ-Bar Skullcrusher'],
  ['Dips_-_Triceps_Version', 'triceps', ['dipbars'], 'c', 'Triceps Dip'],
  ['Lying_Dumbbell_Tricep_Extension', 'triceps', ['dumbbells', 'bench'], 'i', 'Dumbbell Skullcrusher'],
  ['Standing_Dumbbell_Triceps_Extension', 'triceps', ['dumbbells'], 'i', 'Overhead Dumbbell Extension'],
  ['Close-Grip_Barbell_Bench_Press', 'triceps', ['barbell', 'bench', 'rack'], 'c'],
  ['Bench_Dips', 'triceps', ['bench'], 'c', 'Bench Dip'],
  ['Push-Ups_-_Close_Triceps_Position', 'triceps', [], 'c', 'Close-Grip Push-Up'],
  // horizontal pull
  ['Bent_Over_Barbell_Row', 'row', ['barbell'], 'c', 'Barbell Row'],
  ['Seated_Cable_Rows', 'row', ['cables'], 'c', 'Seated Cable Row'],
  ['One-Arm_Dumbbell_Row', 'row', ['dumbbells', 'bench'], 'c'],
  ['Leverage_Iso_Row', 'row', ['rowmachine'], 'c', 'Machine Row'],
  ['Bent_Over_Two-Dumbbell_Row', 'row', ['dumbbells'], 'c', 'Bent-Over Dumbbell Row'],
  ['Two-Arm_Kettlebell_Row', 'row', ['kettlebell'], 'c', 'Kettlebell Row'],
  ['Inverted_Row', 'row', ['barbell', 'rack'], 'c'],
  // vertical pull
  ['Pullups', 'pulldown', ['pullup'], 'c', 'Pull-Up', 'intermediate'],
  ['Wide-Grip_Lat_Pulldown', 'pulldown', ['latpulldown'], 'c', 'Lat Pulldown'],
  ['Chin-Up', 'pulldown', ['pullup'], 'c', 'Chin-Up', 'intermediate'],
  ['Close-Grip_Front_Lat_Pulldown', 'pulldown', ['latpulldown'], 'c', 'Close-Grip Pulldown'],
  ['Band_Assisted_Pull-Up', 'pulldown', ['pullup', 'bands'], 'c'],
  ['Straight-Arm_Pulldown', 'pulldown', ['cables'], 'i'],
  // biceps
  ['Barbell_Curl', 'biceps', ['barbell'], 'i'],
  ['Dumbbell_Bicep_Curl', 'biceps', ['dumbbells'], 'i', 'Dumbbell Curl'],
  ['EZ-Bar_Curl', 'biceps', ['ezbar'], 'i'],
  ['Hammer_Curls', 'biceps', ['dumbbells'], 'i', 'Hammer Curl'],
  ['Standing_Biceps_Cable_Curl', 'biceps', ['cables'], 'i', 'Cable Curl'],
  ['Incline_Dumbbell_Curl', 'biceps', ['dumbbells', 'bench'], 'i'],
  // squat pattern
  ['Barbell_Squat', 'squat', ['barbell', 'rack'], 'c', 'Back Squat'],
  ['Leg_Press', 'squat', ['legpress'], 'c'],
  ['Hack_Squat', 'squat', ['hacksquat'], 'c'],
  ['Smith_Machine_Squat', 'squat', ['smith'], 'c'],
  ['Front_Barbell_Squat', 'squat', ['barbell', 'rack'], 'c', 'Front Squat', 'intermediate'],
  ['Goblet_Squat', 'squat', ['kettlebell'], 'c'],
  ['Dumbbell_Squat', 'squat', ['dumbbells'], 'c'],
  ['Bodyweight_Squat', 'squat', [], 'c'],
  // quad isolation
  ['Leg_Extensions', 'quad_iso', ['legext'], 'i', 'Leg Extension'],
  // single leg
  ['Split_Squat_with_Dumbbells', 'lunge', ['dumbbells', 'bench'], 'c', 'Bulgarian Split Squat'],
  ['Dumbbell_Lunges', 'lunge', ['dumbbells'], 'c', 'Dumbbell Lunge'],
  ['Barbell_Lunge', 'lunge', ['barbell', 'rack'], 'c'],
  ['Dumbbell_Step_Ups', 'lunge', ['dumbbells', 'bench'], 'c', 'Dumbbell Step-Up'],
  ['Bodyweight_Walking_Lunge', 'lunge', [], 'c', 'Walking Lunge'],
  // hinge
  ['Romanian_Deadlift', 'hinge', ['barbell'], 'c'],
  ['Barbell_Deadlift', 'hinge', ['barbell'], 'c', 'Deadlift'],
  ['Stiff-Legged_Dumbbell_Deadlift', 'hinge', ['dumbbells'], 'c', 'Dumbbell Romanian Deadlift'],
  ['One-Arm_Kettlebell_Swings', 'hinge', ['kettlebell'], 'c', 'Kettlebell Swing'],
  ['Pull_Through', 'hinge', ['cables'], 'c', 'Cable Pull-Through'],
  ['Hyperextensions_Back_Extensions', 'hinge', ['backext'], 'c', 'Back Extension'],
  // hamstring curl
  ['Lying_Leg_Curls', 'ham_curl', ['legcurl'], 'i', 'Lying Leg Curl'],
  ['Seated_Leg_Curl', 'ham_curl', ['legcurl'], 'i'],
  ['Seated_Band_Hamstring_Curl', 'ham_curl', ['bands'], 'i', 'Band Hamstring Curl'],
  // glutes
  ['Barbell_Hip_Thrust', 'glute', ['barbell', 'bench'], 'c', 'Hip Thrust'],
  ['One-Legged_Cable_Kickback', 'glute', ['cables'], 'i', 'Cable Kickback'],
  ['Barbell_Glute_Bridge', 'glute', ['barbell'], 'c'],
  ['Single_Leg_Glute_Bridge', 'glute', [], 'i', 'Single-Leg Glute Bridge'],
  ['Butt_Lift_Bridge', 'glute', [], 'i', 'Glute Bridge'],
  // calves
  ['Standing_Calf_Raises', 'calf', ['calfmachine'], 'i', 'Standing Calf Raise'],
  ['Seated_Calf_Raise', 'calf', ['calfmachine'], 'i'],
  ['Calf_Press_On_The_Leg_Press_Machine', 'calf', ['legpress'], 'i', 'Leg Press Calf Raise'],
  ['Smith_Machine_Calf_Raise', 'calf', ['smith'], 'i'],
  ['Standing_Dumbbell_Calf_Raise', 'calf', ['dumbbells'], 'i', 'Dumbbell Calf Raise'],
  // core
  ['Hanging_Leg_Raise', 'core', ['pullup'], 'i'],
  ['Cable_Crunch', 'core', ['cables'], 'i'],
  ['Plank', 'core', [], 'i', 'Plank', 'beginner', true],
  ['Flat_Bench_Lying_Leg_Raise', 'core', ['bench'], 'i', 'Lying Leg Raise'],
  ['Crunches', 'core', [], 'i', 'Crunch'],
  ['Reverse_Crunch', 'core', [], 'i'],
  ['Russian_Twist', 'core', [], 'i'],
  ['Dead_Bug', 'core', [], 'i'],
  ['Air_Bike', 'core', [], 'i', 'Bicycle Crunch'],
  ['Mountain_Climbers', 'core', [], 'i', 'Mountain Climber'],
];

const imgDir = path.join(root, 'assets/exercises');
fs.mkdirSync(imgDir, { recursive: true });

const out = [];
const requires = [];
for (const [id, slot, equipment, kind, name, level, timed] of C) {
  const e = byId[id];
  if (!e) throw new Error('Missing exercise in source db: ' + id);
  const key = id.replace(/[^A-Za-z0-9]/g, '_').toLowerCase();
  for (let i = 0; i < 2; i++) {
    const file = path.join(imgDir, `${key}_${i}.jpg`);
    if (!fs.existsSync(file)) {
      const res = await fetch(RAW + e.images[i]);
      if (!res.ok) throw new Error(`Image fetch failed ${res.status}: ${e.images[i]}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
  }
  requires.push(
    `  ${JSON.stringify(key)}: [require('../../assets/exercises/${key}_0.jpg'), require('../../assets/exercises/${key}_1.jpg')],`
  );
  out.push({
    id: key,
    name: name ?? e.name,
    slot,
    equipment,
    compound: kind === 'c',
    level: level ?? (e.level === 'expert' ? 'advanced' : 'beginner'),
    timed: !!timed,
    bodyweight: equipment.length === 0 || ['pullup', 'dipbars'].some((q) => equipment.includes(q)) && !equipment.includes('bands') || id === 'Bench_Dips' || id === 'Inverted_Row' || id === 'Flat_Bench_Lying_Leg_Raise',
    primary: e.primaryMuscles,
    secondary: e.secondaryMuscles,
    instructions: e.instructions,
  });
}

const ts = `// GENERATED by scripts/build-exercises.mjs. Do not edit by hand.
// Exercise data and images: free-exercise-db (public domain, Unlicense).
import type { Exercise } from '../types';

export const EXERCISES: Exercise[] = ${JSON.stringify(out, null, 1)};

export const EXERCISE_IMAGES: Record<string, [number, number]> = {
${requires.join('\n')}
};
`;
fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/exercises.ts'), ts);
console.log(`Wrote ${out.length} exercises`);
