export type WeddingEvent = { id: 'wedding'; name: string; date: string; dateDisplay?: string; start: string; end: string; venue: string; mapUrl: string; description: string; image?: string };
export type QuizChoice = 'bride' | 'groom' | 'both';
export type QuizQuestion = { question: string; answer: QuizChoice | null };
export const wedding = {
  bride: 'Sudipta', groom: 'Nitesh',
  brideMother: 'Anindita Sengupta', brideFather: 'Sudip Sengupta', groomMother: 'Sumita Mehera', groomFather: 'Apurbendu Mehera', groomSibling: 'Amrita Mehera Maity',
  timezone: 'Asia/Kolkata',
  outfits: { wedding: 'Ethnic Indian themed' },
  photos: { hero: '', heroDriveLink: 'https://drive.google.com/drive/folders/1yPqNa7F5y8LqtY2kMolfGJ9GdubVIccT?usp=sharing', story1: '/photos/story-trek-us.jpg', story2: '/photos/story-kitchen-new.jpg', story3: '/photos/story-mountain-us.jpg' },
  quotes: { guide: 'The joy of this day is brighter because you are part of it.', welcome: 'In all the little moments, we found our forever.', story: 'A thousand ordinary days, made extraordinary together.', closing: 'The best part of our story is sharing it with you.' },
  story: [ { title: 'Our different ideas of adventure but same Wanderlust', image: '/photos/story-trek-us.jpg', alt: 'A wife encourages her husband to go trekking as he holds a teapot.', dialogue: ['I want to stay back and make tea.', 'Let’s go trekking!'] }, { title: "He's the Chef, She's the Chef in Training.", image: '/photos/story-kitchen-new.jpg', alt: 'A couple cooking together in their kitchen.', dialogue: ['You are a good learner, you will learn quickly.', "Can’t we order?"] }, { title: 'Some little differences, one beautiful constant — watching Himalayan sunsets together.', image: '/photos/story-mountain-us.jpg', alt: 'A couple sit together at a mountain viewpoint looking toward Kanchenjunga.', dialogue: [] as string[] } ],
  events: [
    { id:'wedding', name:'Wedding', image:'/photos/wedding-entrance.webp', date:'2027-02-14', start:'18:00', end:'', venue:'JMS VILLA', mapUrl:'https://maps.app.goo.gl/7BycH3Q7AAzmRYbZ6', description:'The moment we say forever.' },
  ] as WeddingEvent[],
  quiz: [
    { question: 'Who can cook good food?', answer: 'groom' },
    { question: 'Who is mostly on time?', answer: 'bride' },
    { question: 'Who loves to walk and travel?', answer: 'bride' },
    { question: 'Who is a better photographer?', answer: 'both' },
  ] as QuizQuestion[],
  rsvp: { endpoint: process.env.NEXT_PUBLIC_RSVP_ENDPOINT || '', maxGuests: 10 },
} as const;
