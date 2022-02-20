const APP = {
  DB: null, // The indexedDB
  isONLINE: "onLine" in navigator && navigator.onLine,
  KEY: "883762e0241bf7da58c9cb6546739dea",
  baseURL: "https://api.themoviedb.org/3/",
  imgURL: "http://image.tmdb.org/t/p/w500",
  results: [],
  movieID: "",
  searchInput: "",

  init: () => {
    IDB.openDatabase();
  },

  addListeners: () => {
    // Add Event Listeners:
    // When the search form is submitted
    let search = document.getElementById("btnSearch");
    search.addEventListener("click", DATA.searchFormSubmitted);

    // When clicking on the list of possible searches on home or 404 page

    // When a message is received

    // When online and offline
    window.addEventListener("online", ONLINE.changeOnlineStatus());
    window.addEventListener("offline", ONLINE.changeOnlineStatus());
  },

  pageSpecific: () => {
    //anything that happens specifically on each page

    switch (document.body.id) {
      case "home":
        console.log("On home page.");
        break;
      case "results":
        console.log("On results page.");
        let param = new URL(document.location).searchParams;
        let keyword = param.get("keyword");

        DATA.getSearchResults(keyword);
        //listener for clicking on the movie card container
        break;

      case "suggest":
        console.log("On suggest page.");
        //on the suggest page
        //listener for clicking on the movie card container
        break;

      case "fourohfour":
        console.log("404");
        break;
    }
  },
};

const SW = {
  register: () => {
    console.log("Registering Service Worker");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(function (error) {
        // Something went wrong during registration. The sw.js file
        // might be unavailable or contain a syntax error.
        console.warn(error);
      });
      navigator.serviceWorker.ready.then((registration) => {
        // .ready will never reject... just wait indefinitely
        registration.active;
        //save the reference to use later or use .ready again

        APP.addListeners();
        APP.pageSpecific();
      });
    }
  },
};

const IDB = {
  openDatabase: () => {
    let version = 1;
    //open the database
    let dbOpenRequest = indexedDB.open("pwaDB", version);
    //add the update, error, success listeners in here
    dbOpenRequest.onupgradeneeded = function (ev) {
      APP.DB = ev.target.result;

      try {
        APP.DB.deleteObjectStore("searchStore");
        APP.DB.deleteObjectStore("recommendStore");
      } catch {
        console.warn("Can't delete DB's, they might not exist yet!");
      }

      //create searchStore with keyword as keyPath
      APP.DB.createObjectStore("searchStore", {
        keyPath: "keyword",
        autoIncrement: false,
      });

      //create suggestStore with movieid as keyPath
      APP.DB.createObjectStore("recommendStore", {
        keyPath: "movieID",
        autoIncrement: false,
      });
    };

    dbOpenRequest.onerror = function (err) {
      console.log(err.message);
    };

    //call nextStep onsuccess
    dbOpenRequest.onsuccess = function (ev) {
      APP.DB = dbOpenRequest.result;
      console.log(`${APP.DB.name} is ready to be used!`);
      SW.register();
    };
  },

  addToDB: (obj, storeName) => {
    //pass in the name of the store
    let param = new URL(document.location).searchParams;
    let keyword = param.get("keyword");

    let tx = IDB.createTransaction(storeName);
    let store = tx.objectStore(storeName);
    let newObj = {
      keyword: keyword,
      results: obj,
    };

    //save the obj passed in to the appropriate store
    let add = store.add(newObj);

    add.onsuccess = (ev) => {
      console.log("Added movies to IDB!");
      DATA.getSearchResults(keyword);
    };
    add.onerror = (ev) => {
      console.warn("Error adding movies to IDB!");
    };
  },

  getFromDB: async (storeName, keyValue) => {
    // Return the results from storeName where it matches keyValue
    console.log("Sending data from IDB");

    let dbTx = IDB.createTransaction(storeName);
    let store = dbTx.objectStore(storeName);
    let dbResults = store.get(keyValue);

    dbResults.onsuccess = function (ev) {
      if (ev.target.result === undefined) {
        // Do a fetch call for search results
        console.log("Fetching from the API");
        DATA.fetchData(keyValue);
        console.log(APP.results);
      } else {
        console.log("Fetching from the DB!");
        console.log(ev.target.result);
         APP.results = ev.target.result.results;
        console.log(APP.results);
      }
    };
  },
  createTransaction: (storeName) => {
    // Create a transaction to use for some interaction with the database
    let tx = APP.DB.transaction(storeName, "readwrite");
    return tx;
  },
};

const DATA = {
  fetchData: async (endpoint) => {
    // Do a fetch call to the endpoint
    let url = `${APP.baseURL}search/movie?api_key=${APP.KEY}&query=${endpoint}`;
    console.log(`Fetching data from ${url}`);

    await fetch(url)
      .then((resp) => {
        if (resp.status >= 400) {
          throw new NetworkError(
            `Failed fetch to ${url}`,
            resp.status,
            resp.statusText
          );
        }
        return resp.json();
      })
      .then(async (contents) => {
        console.log("fetch results");
        // Remove the properties we don't need
        // Save the updated results to APP.results
        APP.results = contents.results;
        console.log(APP.results);

        // Add API response to IDB
        IDB.addToDB(APP.results, "searchStore");
      })
      .catch((err) => {
        // Handle the NetworkError
        console.warn(err);
        ONLINE.navigate("/404.html");
      });
  },

  searchFormSubmitted: (ev) => {
    console.log("Search from submitted.");
    ev.preventDefault();

    // Get the keyword from the input
    APP.searchInput = document.getElementById("search").value.toLowerCase();

    // Make sure the input is not empty

    if (APP.searchInput === "") {
      throw new Error("Please enter a search term!");
    } else {
      ONLINE.navigate(`/results.html?keyword=${APP.searchInput}`);
    }
  },

  getSearchResults: async (keyword) => {
    console.log("getSearchResults");

    await IDB.getFromDB("searchStore", keyword);

    console.log("On the results page");
    console.log(APP.results);
    BUILD.displayCards(APP.results);
  },
};

const ONLINE = {
  changeOnlineStatus: (ev) => {
    //when the browser goes online or offline
    if (APP.isONLINE === true) {
      console.log(APP.isONLINE);
    } else {
      console.log(APP.isONLINE);
    }
  },

  navigate: (url) => {
    console.log(`Navigating to ${url}`);
    location.href = url;
  },
};

const BUILD = {
  displayCards: (movies) => {
    console.log("Building Cards");
    let contentArea = document.querySelector(".contentArea");
    contentArea.innerHTML = "";

    let ol = document.createElement("ol");
    ol.classList.add("suggestMovieCards");

    let df = document.createDocumentFragment();

    console.log(movies);

    movies.forEach((movie) => {
      let li = document.createElement("li");

      // Main card div
      let card = document.createElement("div");
      card.classList.add("card");
      card.setAttribute("style", "width: 18rem");

      // Image
      let img = document.createElement("img");
      // Check if movie has poster or not, if not, set src as placeholder img.
      if (movie.poster_path === null) {
        img.src = "../img/GrumpyCat.png";
        img.alt = "Movie poster not found.";
      } else {
        img.src = `${APP.imgURL}${movie.poster_path}`;
        img.alt = `${movie.original_title}'s movie poster.`;
      }

      // Card Body
      let cardBody = document.createElement("div");
      cardBody.classList.add("card-body");

      // Movie title
      let title = document.createElement("h2");
      title.textContent = `${movie.original_title}`;

      // Movie description
      let movieDesc = document.createElement("p");
      if (movie.overview === "") {
        movieDesc.textContent = "No Description Available :(";
      } else {
        movieDesc.textContent = `${movie.overview}`;
      }

      cardBody.append(title, movieDesc);
      card.append(img, cardBody);
      li.append(card);
      df.append(li);
    });
    ol.append(df);
    contentArea.append(ol);
  },
};

document.addEventListener("DOMContentLoaded", APP.init());



