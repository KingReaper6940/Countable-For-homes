const numberWords = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export function quoteSupportsUnit(quote: string, units: number): boolean {
  if (!Number.isInteger(units) || units <= 0) return false;
  const words = units <= 10 ? `|${numberWords[units]}` : '';
  return new RegExp(`\\b(?:${units}${words})[\\s-]+(?:new\\s+)?(?:residential\\s+)?(?:apartments?|dwelling\\s+units?|units?)\\b`, 'i').test(quote);
}

export function quoteSupportsDate(quote: string, eventDate: string): boolean {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate);
  if (!iso) return false;
  const month = ['January','February','March','April','May','June','July','August','September','October','November','December'][Number(iso[2])-1];
  if (!month) return false;
  const day = Number(iso[3]);
  return [eventDate,`${iso[2]}/${iso[3]}/${iso[1]}`,`${Number(iso[2])}/${day}/${iso[1]}`,`${month} ${day}, ${iso[1]}`,`${month.slice(0,3)} ${day}, ${iso[1]}`,`${day} ${month} ${iso[1]}`]
    .some(date => quote.toLowerCase().includes(date.toLowerCase()));
}
