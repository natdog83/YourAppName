angular.module('yourAppName.services',[])

.factory('encodeURIService', function() {
  return {
    encode: function(string) {
      return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape);
    }
  };
})

.factory('dateService', function($filter) {
  var currentDate = function() {
    var d = new Date();
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  var oneYearAgoDate = function() {
    var d = new Date(new Date().setDate(new Date().getDate() - 365));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };
  return {
    currentDate: currentDate,
    oneYearAgoDate: oneYearAgoDate
  };
})

.factory('chartDataCacheService', function(CacheFactory) {

  var chartDataCache;

  if(!CacheFactory.get('chartDataCache')) {

    chartDataCache = CacheFactory('chartDataCache', {
      maxAge: 60 * 60 * 8 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  }
  else{
    chartDataCache = CacheFactory.get('chartDataCache');
  }
  return chartDataCache;
})

.factory('stockDetailCacheService', function(CacheFactory){

  var stockDetailCache;

  if(!CacheFactory.get('stockDetailCache')) {
    stockDetailCache = CacheFactory('stockDetailCache', {
      maxAge: 60 * 60 * 8 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  }
  else {
    stockDetailCache = CacheFactory.get('stockDetailCache');
  }

  return stockDetailCache;

})

.factory('stockDataService', function($q, $http, encodeURIService, stockDetailCacheService) {
  var getDetailsData = function(ticker) {
    var deferred = $q.defer(),

    cacheKey = ticker,
    stockDetailCache = stockDetailCacheService.get(cacheKey),

    query = 'select * from yahoo.finance.quotes where symbol IN ("' + ticker + '")',
    url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';
    if(stockDetailCache){
      deferred.resolve(stockDetailCache);
    }
    else{
      $http.get(url)
        .success(function(json) {
          var jsonData = json.query.results.quote;
          deferred.resolve(jsonData);
          stockDetailCacheService.put(cacheKey, jsonData);
        })
        .error(function(error) {
          deferred.reject();
        });
    }

    return deferred.promise;
  };
  var getPriceData = function(ticker) {
    var deferred = $q.defer(),
    url = "http://dev.markitondemand.com/MODApis/Api/v2/Quote/json?symbol=" +ticker ;
    $http.get(url)
      .success(function(json) {
        var jsonData = json;
        deferred.resolve(jsonData);
      })
      .error(function(error) {
        console.log("Print data error: " + error);
        deferred.reject();
      });
    return deferred.promise;
  };

  return {
    getPriceData: getPriceData,
    getDetailsData: getDetailsData
  };
})

.factory('chartDataService', function($q, $http, encodeURIService, chartDataCacheService) {

  var getHistoricalData = function(ticker, fromDate, todayDate) {

    var deferred = $q.defer(),

    cacheKey = ticker,
    chartDataCache = chartDataCacheService.get(cacheKey),

    query = 'select * from yahoo.finance.historicaldata where symbol IN ("YHOO") and startDate = "' + fromDate + '" and endDate = "' + todayDate + '"';
    url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

    if(chartDataCache){
      deferred.resolve(chartDataCache);
    }
    else{
      $http.get(url)
        .success(function(json) {
          var jsonData = json.query.results.quote;

          var priceData = [],
          volumeData = [];

          jsonData.forEach(function(dayDataObject) {

            var dateToMillis = dayDataObject.Date,
            date = Date.parse(dateToMillis),
            price = parseFloat(Math.round(dayDataObject.Close * 100) / 100 ).toFixed(3),
            volume = dayDataObject.Volume,

            volumeDatum = '[' + date + ','  + volume + ']',
            priceDatum = '[' + date + ',' + price + ']';

            volumeData.unshift(volumeDatum);
            priceData.unshift(priceDatum);

          });

          var formattedChartData =
          '[{' +
            '"key":' + '"volume",' +
            '"bar":' + 'true,' +
            '"values":' + '[' + volumeData + ']' +
          '},' +
          '{' +
            '"key":' + '"' + ticker + '",' +
            '"values":' + '[' + priceData + ']'+
          '}]';

          deferred.resolve(formattedChartData);
          chartDataCacheService.put(cacheKey, formattedChartData);
        })
        .error(function(error) {
          console.log("Chart data error: " + error);
          deferred.reject();

        });
    }
    return deferred.promise;
  };

  return {
    getHistoricalData: getHistoricalData
  };

})

;
