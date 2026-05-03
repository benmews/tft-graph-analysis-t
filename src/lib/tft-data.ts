import { TFTSet } from './types'

export const sampleTFTSet: TFTSet = {
  name: 'Set 13 Sample',
  traits: [
    { id: 'academy', name: 'Academy', color: 'oklch(0.75 0.15 280)' },
    { id: 'artillerist', name: 'Artillerist', color: 'oklch(0.70 0.20 30)' },
    { id: 'enforcer', name: 'Enforcer', color: 'oklch(0.65 0.18 250)' },
    { id: 'family', name: 'Family', color: 'oklch(0.75 0.12 140)' },
    { id: 'firelight', name: 'Firelight', color: 'oklch(0.70 0.25 45)' },
    { id: 'formswapper', name: 'Form Swapper', color: 'oklch(0.80 0.15 320)' },
    { id: 'highroller', name: 'High Roller', color: 'oklch(0.85 0.18 80)' },
    { id: 'ambusher', name: 'Ambusher', color: 'oklch(0.60 0.20 340)' },
    { id: 'bruiser', name: 'Bruiser', color: 'oklch(0.65 0.15 15)' },
    { id: 'dominator', name: 'Dominator', color: 'oklch(0.55 0.22 350)' },
    { id: 'quickstriker', name: 'Quickstriker', color: 'oklch(0.75 0.20 200)' },
    { id: 'rebel', name: 'Rebel', color: 'oklch(0.70 0.25 25)' },
    { id: 'sniper', name: 'Sniper', color: 'oklch(0.65 0.15 100)' },
    { id: 'sorcerer', name: 'Sorcerer', color: 'oklch(0.70 0.22 270)' },
    { id: 'watcher', name: 'Watcher', color: 'oklch(0.60 0.18 220)' },
  ],
  champions: [
    { id: 'powder', name: 'Powder', cost: 1, traits: ['family', 'ambusher'] },
    { id: 'steb', name: 'Steb', cost: 1, traits: ['enforcer', 'watcher'] },
    { id: 'trundle', name: 'Trundle', cost: 1, traits: ['rebel', 'bruiser'] },
    { id: 'vander', name: 'Vander', cost: 1, traits: ['family', 'bruiser'] },
    { id: 'zyra', name: 'Zyra', cost: 1, traits: ['rebel', 'sorcerer'] },
    
    { id: 'violet', name: 'Violet', cost: 2, traits: ['enforcer', 'quickstriker'] },
    { id: 'nocturne', name: 'Nocturne', cost: 2, traits: ['rebel', 'quickstriker'] },
    { id: 'draven', name: 'Draven', cost: 2, traits: ['highroller', 'quickstriker'] },
    { id: 'camille', name: 'Camille', cost: 2, traits: ['enforcer', 'ambusher'] },
    { id: 'akali', name: 'Akali', cost: 2, traits: ['firelight', 'ambusher', 'quickstriker'] },
    
    { id: 'jinx', name: 'Jinx', cost: 3, traits: ['rebel', 'artillerist', 'formswapper'] },
    { id: 'nami', name: 'Nami', cost: 3, traits: ['academy', 'sorcerer'] },
    { id: 'renata', name: 'Renata', cost: 3, traits: ['highroller', 'sorcerer'] },
    { id: 'sett', name: 'Sett', cost: 3, traits: ['firelight', 'bruiser'] },
    { id: 'scar', name: 'Scar', cost: 3, traits: ['rebel', 'watcher'] },
    
    { id: 'ambessa', name: 'Ambessa', cost: 4, traits: ['dominator', 'quickstriker'] },
    { id: 'silco', name: 'Silco', cost: 4, traits: ['rebel', 'dominator', 'sorcerer'] },
    { id: 'ekko', name: 'Ekko', cost: 4, traits: ['firelight', 'formswapper', 'quickstriker'] },
    { id: 'elise', name: 'Elise', cost: 4, traits: ['academy', 'formswapper', 'sorcerer'] },
    { id: 'twisted-fate', name: 'Twisted Fate', cost: 4, traits: ['highroller', 'sorcerer'] },
    
    { id: 'caitlyn', name: 'Caitlyn', cost: 5, traits: ['enforcer', 'sniper'] },
    { id: 'jayce', name: 'Jayce', cost: 5, traits: ['academy', 'formswapper', 'artillerist'] },
    { id: 'leblanc', name: 'LeBlanc', cost: 5, traits: ['dominator', 'sorcerer'] },
    { id: 'mordekaiser', name: 'Mordekaiser', cost: 5, traits: ['rebel', 'dominator', 'bruiser'] },
    { id: 'warwick', name: 'Warwick', cost: 5, traits: ['firelight', 'bruiser'] },
  ],
}
