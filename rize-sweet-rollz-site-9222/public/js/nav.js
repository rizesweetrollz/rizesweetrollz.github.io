function toggleMobile(){
  document.getElementById('mobileMenu').classList.toggle('open');
}

// Point every "Order on DoorDash" button/link at the DOORDASH_LINK set in
// js/config.js, so that link only ever needs to be updated in one place.
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('[data-doordash-link]').forEach(el=>{
    el.href = DOORDASH_LINK;
  });
});
