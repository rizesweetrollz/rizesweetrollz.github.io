
function updateCalendar() {
    const urlParams = new URLSearchParams(window.location.search);
    const today = new Date();
    const currentMonth = parseInt(urlParams.get('month'), 10) || today.getMonth() + 1;
    const currentYear = parseInt(urlParams.get('year'), 10) || today.getFullYear();

    const options = {year: 'numeric', month: 'long'};
    const thisDate = new Date(currentYear, currentMonth - 1, 1)
    const result = thisDate.toLocaleDateString('en-US', options);

    document.getElementById("date-label").innerHTML = result;

    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;

    if (nextMonth > 12) {
	nextMonth = 1;
	nextYear += 1;
    }

    const nextMonthHref = `?month=${nextMonth}&year=${nextYear}`;
    document.getElementById('next-month-arrow').href = nextMonthHref;

    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;

    if (prevMonth < 1) {
	prevMonth = 12;
	prevYear -= 1;
    }

    const prevMonthHref = `?month=${prevMonth}&year=${prevYear}`;
    document.getElementById('previous-month-arrow').href = prevMonthHref;

    let weekday = 0;
    const firstWeekDay = thisDate.getDay();

    //pass in the next month (zero indexed) and day 0 to get
    //the LAST day of THIS month
    const lastDay = new Date(currentYear, currentMonth, 0);
    const prevLastDay = new Date(currentYear, currentMonth - 1, 0);


    const numberOfDays = lastDay.getDate();
    const prevNumberOfDays = prevLastDay.getDate();

//		console.log("FirstDayOfWeek " + firstWeekDay);
//		console.log("This month days: " + numberOfDays);
//		console.log("Last month days: " + prevNumberOfDays);

    const lastSunday = prevNumberOfDays - firstWeekDay + 1;


//		console.log("Last Sunday " + lastSunday);


    const calendarGrid = document.getElementById('calendar-grid');

//		console.log(window.DB_EVENTS);

    function createEvents(eventDate) {
	let eventContent = "";



	const db = window.DB_EVENTS[eventDate];

	function sort(a, b) {
	    let adate = new Date(`${eventDate} ${a.start_time}`);
	    let bdate = new Date(`${eventDate} ${b.start_time}`);
	    return adate - bdate;
	}

	let eventList = [];
	if (db) {
	    eventList = Array.from(db);
	    eventList.sort(sort);
	}

	let addEllipsis = false;

	if (eventList && eventList.length > 3) {
	    eventList = eventList.slice(0, 3);
	    addEllipsis = true;
	}


	eventList?.forEach(event => eventContent += `<div class="calendar-event">${event.title} | ${event.start_time}</div>`);

	if (addEllipsis) {
	    eventContent += "<div>See More...</div>";
	}
	console.log(eventContent);
	return eventContent;
    }

    let index = lastSunday;
    for (index = lastSunday; index <= prevNumberOfDays; index++) {
//		    console.log("day " + index);
	const href = `date.html?year=${prevYear}&month=${prevMonth}&day=${index}`;
	const id = `date-${prevMonth}-${index}-${prevYear}`;

	const numberContent = `<span class="day-number  prev-month">${index}</span>`;
	const eventContent = createEvents(`${prevYear}/${prevMonth}/${index}`);


	const text = `<a class="calendar-button" href="${href}">
			<div class="calendar-day" id=${id}>
			    ${numberContent}${eventContent}</div></a>`;
	calendarGrid.innerHTML += text;
    }

    for (index = 1; index <= numberOfDays; index++) {
//		    console.log("day " + index);
	const href = `date.html?year=${currentYear}&month=${currentMonth}&day=${index}`;
	const id = `date-${currentMonth}-${index}-${prevYear}`;

	const numberContent = `<span class="day-number">${index}</span>`;
	const eventContent = createEvents(`${currentYear}/${currentMonth}/${index}`);

	const text = `<a class="calendar-button" href="${href}">
			<div class="calendar-day" id=${id}>
			    ${numberContent}${eventContent}</div></a>`;
	calendarGrid.innerHTML += text;
    }


    for (index = 1; true; index++) {

	const day = new Date(nextYear, nextMonth - 1, index).getDay();
	if (day === 0) {
	    break;
	}
	console.log("day " + index);
	const href = `date.html?year=${nextYear}&month=${nextMonth}&day=${index}`;
	const id = `date-${nextMonth}-${index}-${prevYear}`;

	const numberContent = `<span class="day-number next-month">${index}</span>`;
	const eventContent = createEvents(`${nextYear}/${nextMonth}/${index}`);

	const text = `<a class="calendar-button" href="${href}">
			<div class="calendar-day" id=${id}>
			    ${numberContent}${eventContent}</div></a>`;
	calendarGrid.innerHTML += text;
	if (day === 6) {
	    break;
	}
    }

}

document.addEventListener("DOMContentLoaded", updateCalendar);
