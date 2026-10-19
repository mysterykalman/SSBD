import {loadThematicRoster} from './pam-thematic-lab.mjs';
const movies = (await loadThematicRoster()).filter(row => row.category === 'Movies');
console.log(JSON.stringify(movies));
