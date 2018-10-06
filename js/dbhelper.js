const DATABASE_VERSION = 1;
let idbPromise = idb.open('restaurants', DATABASE_VERSION, (upgradeDB) => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('response-data');
    case 1:
      upgradeDB.createObjectStore('offline-review');
  }
});

/**
 * Initialize service worker and idbhelper
 */
if(navigator.serviceWorker) {
  navigator.serviceWorker.register('sw.js')
    .catch(err => console.log(err));
}

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static get REVIEWS_URL() {
    const port = 1337;
    return `http://localhost:${port}/reviews`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return fetch(DBHelper.DATABASE_URL).then((response) => {
      if(response.status === 200) {
        return response.json().then(json => json);
      } else {
        return response;
      }
    }).catch(error => error);
  }

  /**
   * Fetch all reviews.
   */
  static fetchReviewsById(id) {
    return fetch(`${DBHelper.REVIEWS_URL}/?restaurant_id=${id}`).then((response) => {
      if(response.status === 200) {
        return response.json().then(json => json);
      } else {
        return response;
      }
    }).catch(error => error);
  }

  static getRestaurants(callback) {
      const errorReporter = (status) => {
        const error = `Request failed. Returned status of ${status}`;
        callback(error, null);
      }

      idbPromise.then((db) => {
        const transaction = db.transaction('response-data'),
          store = transaction.objectStore('response-data');

        return store.get('1337-json');
      }).then((storedJson) => {
        if(!storedJson) {
          DBHelper.fetchRestaurants().then((fetchedJson) => {
            if (fetchedJson.status) {
              errorReporter(fetchedJson.status);
              return;
            }

            idbPromise.then((db) => {
              const transaction = db.transaction('response-data', 'readwrite'),
                store = transaction.objectStore('response-data');

              store.put(fetchedJson, '1337-json');

              return transaction.complete;
            });
            callback(null, fetchedJson);
          });
        } else {
          callback(null, storedJson);
        }
      });
    };

  static updateRestaurants(restaurants) {
    idbPromise.then((db) => {
      const transaction = db.transaction('response-data', 'readwrite'),
        store = transaction.objectStore('response-data');

      store.put(restaurants, '1337-json');
      return transaction.complete
    });
  }

  static getReviewsById(id, callback) {
      const errorReporter = (status) => {
        const error = `Request failed. Returned status of ${status}`;
        callback(error, null);
      }

      idbPromise.then((db) => {
        const transaction = db.transaction('response-data'),
          store = transaction.objectStore('response-data');

        return store.get(`1337-json-reviews-${id}`);
      }).then((storedJson) => {
        DBHelper.fetchReviewsById(id).then((fetchedJson) => {
          if (fetchedJson instanceof Error && storedJson) {
            callback(null, storedJson);
            return;
          } else if(fetchedJson.status) {
            errorReporter(fetchedJson.status);
            return;
          }

          // If not offline, store and respond with the data received from the server
          idbPromise.then((db) => {
            const transaction = db.transaction('response-data', 'readwrite'),
              store = transaction.objectStore('response-data');

            store.put(fetchedJson, `1337-json-reviews-${id}`);
            return transaction.complete;
          });
          callback(null, fetchedJson);
        });
      });
    };
  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  static updateRestaurantFavoriteById(id, favorite, callback) {
    DBHelper.getRestaurants((error, restaurants) => {
      if(error) {
        callback(error);
      } else {
        restaurants[id - 1].is_favorite = favorite;
        DBHelper.updateRestaurants(restaurants);
        callback(null);
      }
    });
  }

  static saveOfflineReview(reviewData) {
    idbPromise.then((db) => {
      const transaction = db.transaction('offline-review', 'readwrite'),
        store = transaction.objectStore('offline-review');

      store.put(reviewData, `review-${reviewData.restaurant_id}`);
      return transaction.complete;
    });
  }

  static getOfflineReviewByRestaurantId(id, callback) {
    idbPromise.then((db) => {
      const transaction = db.transaction('offline-review'),
        store = transaction.objectStore('offline-review');

      return store.get(`review-${id}`);
    }).then((review) => {
      if(review) {
        callback(null, review);
      } else {
        callback('No offline reviews stored for this restaurant', null);
      }
    });
  }

  static deleteOfflineReviewByRestaurantId(id, callback) {
    idbPromise.then((db) => {
      const transaction = db.transaction('offline-review', 'readwrite'),
        store = transaction.objectStore('offline-review');

      store.delete(`review-${id}`);
      return transaction.complete;
    }).then(() => {
      callback(null);
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/dist/imgs/${restaurant.id}-small.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
