// DON'T FORGET TO ADJUST YOUR SAVED SEARCH SETTINGS, AND SET A SAVED MESSAGE IN message.txt!

export default {
    USERNAME: "a@b.com", // kamernet email
    PASSWORD: "*******",      // kamernet password
    CITY: "delft", // the city name you are looking for (this should be in the url when you perform a search
    RADIUS: 2, // can be 0/1/2/5/10/20
    INTERNATIONAL_STUDENT: false, // if true, it filters out adverts with NO INTERNATIONALS in the description
    TIME_INTERVAL_MINUTES: 10, // time interval in which it sends messages (min),
    TIMEOUT_MINUTES: 10, // time after the interval stops (Can be Infinity)
    PAGE_COUNT: 3 // the number of pages to fetch and send responses to
};

