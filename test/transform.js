var assert = require('assert'),
    vcharts = require('../src/index.js');

describe('transform', function () {
    describe('base', function () {
        it('should pass through basic structures', function () {
            assert.deepEqual({}, vcharts.transform({}));
            assert.deepEqual([], vcharts.transform([]));
            assert.deepEqual('hi', vcharts.transform('hi'));
            assert.deepEqual(1.2, vcharts.transform(1.2));
            assert.deepEqual(true, vcharts.transform(true));
            assert.deepEqual(null, vcharts.transform(null));
        });

        it('should pass through deeper objects', function () {
            var deeper = {
                a: [1, 2, 'abc'],
                b: {c: false},
                c: null
            };
            assert.deepEqual(deeper, vcharts.transform(deeper));
        });
    });

    describe('@get', function () {
        it('should lookup values', function () {
            var spec = ['@get', 'a'];
            assert.deepEqual(12, vcharts.transform(spec, {a: 12}));
        });

        it('should default values', function () {
            var spec = ['@get', 'a', 5];
            assert.deepEqual(5, vcharts.transform(spec, {b: 12}));
        });

        it('should only override undefined values', function () {
            var spec = ['@get', 'a', 5];
            assert.deepEqual(0, vcharts.transform(spec, {a: 0}));
            assert.deepEqual(false, vcharts.transform(spec, {a: false}));
            assert.deepEqual(5, vcharts.transform(spec, {a: undefined}));
        });

        it('should evaluate default values', function () {
            var spec = ['@get', 'a', ['@eq', 5, 2]];
            assert.deepEqual(false, vcharts.transform(spec, {b: 12}));
        });

        it('should not reuse default values later', function () {
            var spec = [['@get', 'a', 5], ['@get', 'a']];
            assert.deepEqual([5, null], vcharts.transform(spec, {b: 12}));
        });

        it('should not modify options', function () {
            var spec = [['@get', 'a', 5], ['@get', 'a']];
            var options = {b: 12};
            vcharts.transform(spec, options);
            assert.deepEqual({b: 12}, options);
        });
    });

    describe('@defaults', function () {
        it('should allow nested defaulting on defined parent', function () {
            var spec = [
                '@defaults',
                [['a.b', 5]],
                [['@get', 'a.b'], ['@get', 'a.d']]
            ];
            assert.deepEqual([5, 1], vcharts.transform(spec, {a: {d: 1}}));
        });

        it('should allow nested defaulting on undefined parent', function () {
            var spec = [
                '@defaults',
                [['a.b', 5]],
                ['@get', 'a.b']
            ];
            assert.deepEqual(5, vcharts.transform(spec));
        });

        it('should not override options', function () {
            var spec = [
                '@defaults',
                [['a', 5]],
                ['@get', 'a']
            ];
            assert.deepEqual(7, vcharts.transform(spec, {a: 7}));
        });

        it('should only override undefined values', function () {
            var spec = ['@defaults', [['a', 5]], ['@get', 'a']];
            assert.deepEqual(0, vcharts.transform(spec, {a: 0}));
            assert.deepEqual(false, vcharts.transform(spec, {a: false}));
            assert.deepEqual(5, vcharts.transform(spec, {a: undefined}));
        });
    });

    describe('@map', function () {
        it('should build an array', function () {
            var spec = ['@map', [1, 2, 3], 'd', ['@get', 'd']];
            assert.deepEqual([1, 2, 3], vcharts.transform(spec));
        });

        it('should not add null array items', function () {
            var spec = ['@map', [1, null, 3], 'd', ['@get', 'd']];
            assert.deepEqual([1, 3], vcharts.transform(spec));
        });

        it('can contain complex objects', function () {
            var spec = ['@map', [1, 2, 3], 'd', {a: ['@get', 'd']}];
            assert.deepEqual([{a: 1}, {a: 2}, {a: 3}], vcharts.transform(spec));
        });

        it('can nest', function () {
            var spec = [
                '@map',
                [1, 2, 3],
                'd',
                [
                    '@map',
                    ['a', 'b'],
                    'dd',
                    {
                        d: ['@get', 'd'],
                        dd: ['@get', 'dd']
                    }
                ]
            ];
            assert.deepEqual([
                [{d: 1, dd: 'a'}, {d: 1, dd: 'b'}],
                [{d: 2, dd: 'a'}, {d: 2, dd: 'b'}],
                [{d: 3, dd: 'a'}, {d: 3, dd: 'b'}]
            ], vcharts.transform(spec));
        });

        it('should not modify options', function () {
            var spec = ['@map', [1, 2, 3], 'd', ['@get', 'd']];
            var options = {b: 12};
            vcharts.transform(spec, options);
            assert.deepEqual({b: 12}, options);
        });

        it('should override option with loop variable', function () {
            var spec = ['@map', [1, 2, 3], 'd', ['@get', 'd']];
            var options = {d: 12};
            assert.deepEqual([1, 2, 3], vcharts.transform(spec, options));
            assert.deepEqual({d: 12}, options);
        });
    });

    describe('@if', function () {
        it('should choose first option when true', function () {
            var spec = ['@if', true, 10, 20];
            assert.deepEqual(10, vcharts.transform(spec));
        });

        it('should choose second option when false', function () {
            var spec = ['@if', false, 10, 20];
            assert.deepEqual(20, vcharts.transform(spec));
        });

        it('should work with sub-expressions', function () {
            var spec = ['@if', ['@get', 'a'], ['@get', 'b'], 20];
            assert.deepEqual(5, vcharts.transform(spec, {a: true, b: 5}));
        });

        it('should treat JavaScript falsy values as false', function () {
            var spec = [
                ['@if', null, 10, 20],
                ['@if', undefined, 10, 20],
                ['@if', 0, 10, 20],
                ['@if', NaN, 10, 20],
                ['@if', '', 10, 20]
            ]
            assert.deepEqual(
                [20, 20, 20, 20, 20],
                vcharts.transform(spec)
            );
        });
    });

    describe('@eq', function () {
        it('should test for JavaScript === equality', function () {
            var spec = [
                ['@eq', {}, {}],
                ['@eq', 0, 0],
                ['@eq', 'abc', 'abc'],
                ['@eq', 1, '1'],
                ['@eq', null, null]
            ]
            assert.deepEqual(
                [false, true, true, false, true],
                vcharts.transform(spec)
            );
        });

        it('can work with sub-expressions', function () {
            var spec = [
                ['@eq', ['@get', 'a'], 10],
                ['@eq', ['@get', 'b'], ['@get', 'c']]
            ];
            assert.deepEqual(
                [true, true],
                vcharts.transform(spec, {a: 10, b: 5, c: 5})
            );
        });
    });

    describe('@min', function () {
        it('should find minimum of array', function () {
            var spec = [
                '@min', [{v: 10}, {v: 2}, {v: 3}, {v: 1}, {v: 8}], 'v'
            ]
            assert.equal(1, vcharts.transform(spec));
        });
    });

    describe('@max', function () {
        it('should find maximum of array', function () {
            var spec = [
                '@max', [{v: 10}, {v: 2}, {v: 3}, {v: 1}, {v: 8}], 'v'
            ]
            assert.equal(10, vcharts.transform(spec));
        });
    });

    describe('@join', function () {
        it('should join strings', function () {
            var spec = [
                '@join', ',', ['a', 'b', 'c', 'd']
            ]
            assert.equal('a,b,c,d', vcharts.transform(spec));
        });
    });

});
