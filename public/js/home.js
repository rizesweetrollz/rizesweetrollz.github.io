// ─────────────────────────────────────────────────────────
// HOMEPAGE PHOTO BELT — edit this list to change which photos
// scroll past in the "What People Are Saying" section.
// Each photo only needs to be listed ONCE — the code below
// duplicates the list automatically to make the scroll loop
// seamless, so the image itself is never stored twice.
// ─────────────────────────────────────────────────────────
const BELT_IMAGES = [
  { src: 'images/cinnamon-roll-with-fresh-fruit-and-orange-juice.jpg', alt: 'Roll with fresh fruit and orange juice' },
  { src: 'images/fresh-baked-cinnamon-rolls-in-pan.jpg', alt: 'Fresh-baked cinnamon rolls in pan' },
  { src: 'images/rolls-on-parchment-paper.jpg', alt: 'Rolls on parchment paper' },
  { src: 'images/six-rolls-in-glass-baking-dish.jpg', alt: 'Six rolls in glass baking dish' },
  { src: 'images/the-rize-sweet-rollz-support-team.jpg', alt: 'The Rize Sweet Rollz support team' },
  { src: 'images/fresh-cinnamon-rolls-in-blue-baking-dish.jpg', alt: 'Rolls in navy baking dish' },
  { src: 'images/large-tray-of-rolls-with-berries.jpg', alt: 'Large tray of rolls with berries' },
  { src: 'images/close-up-of-frosted-rolls.jpg', alt: 'Close-up of frosted rolls' },
  { src: 'images/spreading-cream-cheese-frosting.jpg', alt: 'Spreading cream cheese frosting' }
];

// ─────────────────────────────────────────────────────────
// CUSTOMER REVIEWS — edit this list to add/remove/change reviews.
// Star rating is fixed at 5; if you ever want variable ratings,
// change each entry to { text: '...', stars: 4 } and update
// renderReviews() below to loop stars.length times.
// ─────────────────────────────────────────────────────────
const REVIEWS = [
  "Everyone is obsessed with the rolls!!",
  "Literally the best I've ever tried.",
  "Casey, these are amazing! Thank you!",
  "These are probably the best cinnamon rolls I've ever had.",
  "So easy and delicious — perfect for our family events!"
];

function renderBelt(){
  const track = document.getElementById('beltTrack');
  if(!track) return;
  // Render the list twice back-to-back so the CSS animation
  // (translateX -50%) loops seamlessly.
  const slides = BELT_IMAGES.concat(BELT_IMAGES)
    .map(img => `<div class="belt-slide"><img src="${img.src}" alt="${img.alt}" loading="lazy"></div>`)
    .join('');
  track.innerHTML = slides;
}

let reviewIdx = 0, reviewPaused = false;

function renderReviews(){
  const track = document.getElementById('reviewTrack');
  if(!track) return;
  track.innerHTML = REVIEWS.map(text => `
    <div class="review-slide"><div class="review-card">
      <div class="stars"><div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div></div>
      <p class="review-text">"${text}"</p>
    </div></div>`).join('');
  buildReviewDots(0);

  track.parentElement.addEventListener('mouseenter', ()=> reviewPaused = true);
  track.parentElement.addEventListener('mouseleave', ()=> reviewPaused = false);
  setInterval(()=>{ if(!reviewPaused) goToReview((reviewIdx+1) % REVIEWS.length); }, 3800);
}

function buildReviewDots(active){
  const wrap = document.getElementById('reviewDots');
  wrap.innerHTML = '';
  REVIEWS.forEach((_, i)=>{
    const dot = document.createElement('button');
    dot.className = 'rdot' + (i === active ? ' active' : '');
    dot.addEventListener('click', ()=> goToReview(i));
    wrap.appendChild(dot);
  });
}

function goToReview(i){
  reviewIdx = i;
  document.getElementById('reviewTrack').style.transform = `translateX(-${reviewIdx*100}%)`;
  buildReviewDots(reviewIdx);
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderBelt();
  renderReviews();
});
