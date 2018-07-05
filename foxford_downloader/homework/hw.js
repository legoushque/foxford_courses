if (/https:\/\/foxford\.ru\/lessons\/(\d+)\/tasks\/(\d+)/.test(location.href) && document.readyState === "complete") {
  document.querySelector('div[class^="Content__wrapper__"]').innerHTML = document.querySelector('div[class^="Content__content__"]').outerHTML;
  window.print();

} else {
  console.log("Данные ещё не успели загрузиться, либо это вообще не та страница.");
}
