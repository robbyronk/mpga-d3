'use strict';

angular.module('mpga', ['mpgaControllers', 'mpgaFilters', 'mpgaServices', 'mpgaDirectives']).
  config(['$routeProvider', function ($routeProvider) {
  $routeProvider.
    when('/current-partners', { templateUrl:'partials/current-partners.html', controller: 'CurrentPartnersController'}).
    when('/lost-partners', { templateUrl:'partials/lost-partners.html', controller: 'LostPartnersController'}).
    when('/statistical-analysis', { templateUrl:'partials/statistical-analysis.html', controller:'StatisticalAnalysisController'}).
    when('/giving-range', { templateUrl:'partials/giving-range.html', controller: 'GivingRangeController'}).
    when('/giving-frequency', { templateUrl:'partials/giving-frequency.html', controller: 'GivingFrequencyController'}).
    when('/expenses', { templateUrl:'partials/expenses.html', controller: 'ExpensesController'}).
    otherwise({redirectTo:'/current-partners'});
}]).
  run(['$rootScope', function (rootScope) {
  rootScope.isLostPartner = function (partner) {
    return partner.twelveMonthTotalCount == 0;
  }
}]);

/* Controllers */
angular.module('mpgaControllers', []).
  controller('CurrentPartnersController', ['$scope', 'Partners', function(scope, Partners) {
  scope.sortOn = function(column) {
    if(scope.sortingColumn === column) {
      scope.reverse = !scope.reverse;
    } else
      scope.reverse = false;
    scope.arrowDirection = (scope.reverse ? 'descending' : 'ascending'); //CSS class names
    scope.sortingColumn = column;
    scope.active = {};
    scope.active[column] = 'sorting'; //CSS class name
  };

  var partners = Partners.query(function () {
    scope.partners = _.reject(partners, scope.isLostPartner);
  });

  scope.partnersData = [
    { 'label':'top 50', 'value':16},
    { 'label':'bottom 50', 'value':107}
  ];
}]).
  controller('LostPartnersController', ['$scope', 'Partners', function(scope, Partners) {
  scope.sortOn = function(column) {
    if(scope.sortingColumn === column) {
      scope.reverse = !scope.reverse;
    } else
      scope.reverse = false;
    scope.arrowDirection = (scope.reverse ? 'descending' : 'ascending'); //CSS class names
    scope.sortingColumn = column;
    scope.active = {};
    scope.active[column] = 'sorting'; //CSS class name
  };
  
  var partners = Partners.query(function() {
    scope.lostPartners = _.filter(partners, scope.isLostPartner);
  });
}]).
  controller('StatisticalAnalysisController', ['$scope', '$filter', 'Partners', function (scope, filter, Partners) {
  var amount = filter('amount');
  scope.singleGivers = [];
  scope.multipleGivers = [];
  scope.totalCurrentPartners = [];

  var partners = Partners.query(function () {
    var lostPartners = _.filter(partners, scope.isLostPartner);

    var newPartners = _.filter(partners, function (partnerRow) {
      // is their first gift in the past year?
      return moment().diff(moment(partnerRow.firstTransactionDate), 'years') == 0;
    });

    scope.partnersStatus = {
      lostPartners:_.size(lostPartners),
      newPartners:_.size(newPartners),
      currentPartners:_.size(partners) - ( _.size(lostPartners) + _.size(newPartners) )
    };

    scope.multipleGivers = _.filter(partners, function (partnerRow) {
      return partnerRow.twelveMonthTotalCount > 1;
    });
    scope.singleGivers = _.filter(partners, function (partnerRow) {
      return partnerRow.twelveMonthTotalCount == 1;
    });
    scope.totalCurrentPartners = _.union(scope.multipleGivers, scope.singleGivers);

    scope.multipleGiversGiftCount = _.chain(scope.multipleGivers).
      pluck('twelveMonthTotalCount').
      reduce(function (a, b) {
        return a + b;
      }).
      value();
    scope.singleGiversGiftCount = _.chain(scope.singleGivers).
      pluck('twelveMonthTotalCount').
      reduce(function (a, b) {
        return a + b;
      }).
      value();
    scope.totalGiftCount = scope.multipleGiversGiftCount + scope.singleGiversGiftCount;

    scope.multipleGiversTotalAmount = amount(scope.multipleGivers);
    scope.singleGiversTotalAmount = amount(scope.singleGivers);
    scope.totalAmount = scope.multipleGiversTotalAmount + scope.singleGiversTotalAmount;
  });
}]).
  controller('GivingRangeController', ['$scope', '$filter', 'Partners', function (scope, filter, Partners) {
  var amount = filter('amount');
  scope.ranges = [
    {high:10000000, low:200},
    {high:200, low:150},
    {high:150, low:100},
    {high:100, low:75},
    {high:75, low:50},
    {high:50, low:25},
    {high:25, low:10},
    {high:10, low:0}
  ];

  var partners = Partners.query(function() {
    scope.currentPartners = _.reject(partners, scope.isLostPartner);

    scope.totalCount = _.size(scope.currentPartners);

    scope.totalAmount = amount(scope.currentPartners);
  });
}]).
  controller('GivingFrequencyController', ['$scope', '$filter', 'Partners', function (scope, filter, Partners) {
  var amount = filter('amount');
  scope.ranges = [
    {label: '1 Gift', high:1, low:1},
    {label: '2-4 Gifts', high:4, low:2},
    {label: '5-6 Gifts', high:6, low:5},
    {label: '7-10 Gifts', high:10, low:7},
    {label: '11-12 Gifts', high:12, low:11},
    {label: '13+ Gifts', high:1000000, low:13}
  ];

  var partners = Partners.query(function() {
    scope.currentPartners = _.reject(partners, scope.isLostPartner);

    scope.totalCount = _.size(scope.currentPartners);

    scope.totalAmount = amount(scope.currentPartners);
  });
}]).
  controller('ExpensesController', ['$scope', 'Expenses', 'Income', function(scope, Expenses, Income) {
  scope.months = _.map(_.range(12), function(monthsToAdd) {
    return moment().subtract('years', 1).add('months', monthsToAdd).format('YYYY-MM');
  });

  var pullOutMatchingDescriptions = function(expenseItems, predicate) {
    return _.chain(expenseItems).
      map(function(monthDatum) {
        return _.chain(monthDatum.transactionSummaries).
          filter(predicate).
          pluck('Description').
          value();
      }).
      flatten().
      unique().
      value();
  };

  var income = Income.query(function() {
    scope.income = income;

    //income is all positive entries
    var incomePredicate = function(transactionSummary){
      return transactionSummary.total > 0;
    };
    scope.incomeDescriptions = pullOutMatchingDescriptions(income, incomePredicate);
  });

  var expenses = Expenses.query(function() {
    scope.expenses = expenses; // subject to change

    //ministry is category === reimbursement
    var ministryPredicate = function(transactionSummary){
      return transactionSummary.category === 'reimbursement';
    };
    scope.ministryDescriptions = pullOutMatchingDescriptions(expenses, ministryPredicate);

    //last table is `category in (benefits, salary, contributions-assessment)`
    var beneSalCont = ['benefits', 'salary', 'contributions-assessment'];
    var beneSalContPredicate = function(transactionSummary){
      return _.contains(beneSalCont, transactionSummary.category);
    };
    scope.benefitsDescriptions = pullOutMatchingDescriptions(expenses, beneSalContPredicate);

    //misc has everything else
    var miscPredicate = function(transactionSummary) {
      return !ministryPredicate(transactionSummary) &&
        !beneSalContPredicate(transactionSummary);
    };
    scope.miscDescriptions = pullOutMatchingDescriptions(expenses, miscPredicate);
  });
}]).
  controller('NavigationController', ['$scope', '$location', function(scope, location) {
  scope.navClass = function (page) {
    var currentRoute = location.path().substring(1) || 'current-partners';
    return (page === currentRoute) ? 'active' : '';
  }
}]);

/* Filters */
angular.module('mpgaFilters', []).
  filter('divideByTwelve', function () {
    return function(input) {
      if(_.isNumber(input))
        return input / 12;
      else
        return input;
    };
  }).
  filter('amount', function () {
    return function(partners) {
      return _.chain(partners).
        pluck('twelveMonthTotalAmount').
        reduce( function(a, b){ return a + b; }, 0).
        value();
    };
  }).
  filter('monthlyAmount', function () {
    return function(partners) {
      return _.chain(partners).
        pluck('twelveMonthTotalAmount').
        reduce( function(a, b){ return a + b; }, 0).
        value() / 12;
    };
  }).
  filter('monthlyAmountPerPartner', function () {
    return function(partners) {
      return _.chain(partners).
        pluck('twelveMonthTotalAmount').
        reduce( function(a, b){ return a + b; }, 0).
        value() / 12 / _.size(partners);
    };
  }).
  filter('size',function () {
    return function(arr) {
      return _.size(arr);
    };
  }).
  filter('amountPercentage', function () {
    return function(partners, total) {
      return _.chain(partners).
        pluck('twelveMonthTotalAmount').
        reduce( function(a, b){ return a + b; }, 0).
        value() / total * 100;
    };
  }).
  filter('countPercentage', function () {
    return function(partners, total) {
      return _.size(partners) / total * 100;
    };
  }).
  filter('rangeHighPass', function () {
    // Careful, this function is a high PASS.
    // All partners with HIGHER than range.low * 12 yearly giving are allowed through
    return function(partners, range) {
      if(_.isArray(partners))
        return _.filter(partners, function(partner) {
          return partner['twelveMonthTotalAmount'] > range.low * 12;
        });
      else
        return [];
    };
  }).
  filter('rangeBandPass', function () {
    return function(partners, range) {
      if(_.isArray(partners))
        return _.filter(partners, function(partner) {
          return partner['twelveMonthTotalAmount'] < range.high * 12
            && partner['twelveMonthTotalAmount'] > range.low * 12;
        });
      else
        return [];
    };
  }).
  filter('frequencyBandPass', function () {
    return function(partners, range) {
      if(_.isArray(partners))
        return _.filter(partners, function(partner) {
          return partner.twelveMonthTotalCount <= range.high
            && partner.twelveMonthTotalCount >= range.low;
        });
      else
        return [];
    };
  }).
  filter('matchDescriptionAndSum', function () {
    return function(monthData, description) {
      // the filter before this one is passing an array of months, like the income/expense data
      if(_.size(monthData) == 0)
        return 0;
      else
        return _.chain(monthData).
          map(function(monthDatum) {
            return _.chain(monthDatum.transactionSummaries).
              filter(function(transactionSummary) {
                return transactionSummary.Description === description;
              }).
              pluck('total').
              value();
          }).
          flatten().
          reduce( function(a, b){ return a + b; }, 0).
          value();
    };
  });

/* Services */
angular.module('mpgaServices', ['ngResource']).
  factory('Partners', function ($resource) {
    return $resource('testData.json');
  }).
  factory('Expenses', function ($resource) {
    return $resource('example-mpga-expense-data.json');
  }).
  factory('Income', function ($resource) {
    return $resource('example-mpga-income-data.json');
  });

/* Directives */
angular.module('mpgaDirectives', []).
  directive('piechart', function() {
    var width = 300,
      height = 300,
      radius = 100,
      color = d3.scale.category20();

    return {
      restrict: 'A',
      scope: {
        input: '='
      },
      link: function(scope, element, attrs) {
        var vis = d3.select(element[0])
          .append("svg:svg")              //create the SVG element inside the <body>
          .data([scope.input])                   //associate our data with the document
          .attr("width", width)           //set the width and height of our visualization (these will be attributes of the <svg> tag
          .attr("height", height)
          .append("svg:g")                //make a group to hold our pie chart
          .attr("transform", "translate(" + radius + "," + radius + ")")    //move the center of the pie chart from 0, 0 to radius, radius

        var arc = d3.svg.arc()              //this will create <path> elements for us using arc data
          .outerRadius(radius);

        var pie = d3.layout.pie()           //this will create arc data for us given a list of values
          .value(function(d) { return d.value; });    //we must tell it out to access the value of each element in our data array

        var arcs = vis.selectAll("g.slice")     //this selects all <g> elements with class slice (there aren't any yet)
          .data(pie)                          //associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties)
          .enter()                            //this will create <g> elements for every "extra" data element that should be associated with a selection. The result is creating a <g> for every object in the data array
          .append("svg:g")                //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
          .attr("class", "slice");    //allow us to style things in the slices (like text)

        arcs.append("svg:path")
          .attr("fill", function(d, i) { return color(i); } ) //set the color for each slice to be chosen from the color function defined above
          .attr("d", arc);                                    //this creates the actual SVG path using the associated data (pie) with the arc drawing function

        arcs.append("svg:text")                                     //add a label to each slice
          .attr("transform", function(d) {                    //set the label's origin to the center of the arc
            //we have to make sure to set these before calling arc.centroid
            d.innerRadius = 0;
            d.outerRadius = radius;
            return "translate(" + arc.centroid(d) + ")";        //this gives us a pair of coordinates like [50, 50]
          })
          .attr("text-anchor", "middle")                          //center the text on it's origin
          .text(function(d, i) { return scope.input[i].label; });        //get the label from our original data array
      }
    }
  });
