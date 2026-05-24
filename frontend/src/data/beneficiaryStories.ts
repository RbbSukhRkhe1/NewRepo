export type BeneficiaryStory = {
  id: string;
  categoryLabel: string;
  storyHook: string;
  storyHeart: string;
  firstName: string;
  roleLabel: string;
  accent: string;
  statDonors: string;
  statOutcome: string;
};

export const BENEFICIARY_STORIES: BeneficiaryStory[] = [
  {
    id: 'war-relief',
    categoryLabel: 'War relief',
    storyHook: 'When we left with one bag each, I could not picture what came next.',
    storyHeart:
      'Hot meals, a safe roof, and supplies for the children arrived because strangers decided we still mattered. My kids finally slept without flinching at every sound.',
    firstName: 'Amir',
    roleLabel: 'Displaced survivor',
    accent: '#5ef6de',
    statDonors: '214 donors helped fund emergency shelter',
    statOutcome: '62 families reached with meals and kits',
  },
  {
    id: 'medical-support',
    categoryLabel: 'Medical support',
    storyHook: 'Treatment weeks were a blur of appointments and quiet worry.',
    storyHeart:
      'Rides to the clinic and help covering pharmacy gaps meant I could focus on healing, not on choosing between rent and medicine.',
    firstName: 'Lucia',
    roleLabel: 'Cancer recovery patient',
    accent: '#ca90ff',
    statDonors: '189 donors helped fund treatment',
    statOutcome: '847 care visits sponsored for families',
  },
  {
    id: 'education-access',
    categoryLabel: 'Education access',
    storyHook: 'After the storm took our books and laptop, I thought school was over for me.',
    storyHeart:
      'Donors sent supplies and a safe place to study. I walked back into class with my head up, and I kept going.',
    firstName: 'Diego',
    roleLabel: 'Student beneficiary',
    accent: '#7dd3fc',
    statDonors: '128 donors reopened learning doors',
    statOutcome: '18 students returned to school full-time',
  },
  {
    id: 'lgbtq-safe-space',
    categoryLabel: 'LGBTQ+ safe space',
    storyHook: 'I never thought our hometown could feel like somewhere we could just breathe.',
    storyHeart:
      'A counseling circle and a quiet drop-in meant we were not questioned for showing up as ourselves. Transparent funding helped me trust the doors would stay open.',
    firstName: 'Riley',
    roleLabel: 'Community member',
    accent: '#f9a8d4',
    statDonors: '156 donors sustained free programs',
    statOutcome: '420 youth counseling hours kept free',
  },
];
