import { Exp, parseL5Exp } from "../../src/L5/L5-ast";
import { Result, bind, isOkT ,mapv} from "../../src/shared/result";
import { parse as parseSexp } from "../../src/shared/parser";
import { isListTExp, isNumTExp, isBoolTExp, parseTE, TExp, equivalentTEs } from "../../src/L5/TExp";
import * as S from "../../src/L5/L5-substitution-adt";
import { inferType } from "../../src/L5/L5-type-equations";
import { isSome, Optional } from "../../src/shared/optional";
import { sub } from "./test-helpers";

const p = (x: string): Result<Exp> => bind(parseSexp(x), parseL5Exp);

const infer = (src: string): Optional<TExp> => {
    const parsed = p(src);
    if (parsed.tag !== "Ok") throw new Error(`parse failed: ${src}`);
    return inferType(parsed.value);
};

describe('HW3 Extra Tests - Homogeneous Lists', () => {
    describe('Substitution ADT & applySub Extensions', () => {
        
        it('applySub - nested lists (list (list number))', () => {
            const sub1 = sub(["X"], ["number"]);
            const te1 = parseTE("(list (list X))");
            const unparsed = bind(sub1, (sub: S.Sub) =>
                            mapv(te1, (te: TExp) => 
                                S.applySub(sub, te)));
            
            expect(unparsed).toSatisfy(isOkT(isListTExp));
            if (unparsed.tag === "Ok" && isListTExp(unparsed.value)) {
                expect(isListTExp(unparsed.value.itemTE)).toBe(true);
            }
        });

        it('applySub - list inside procedure parameters [ (list X) -> X ]', () => {
            const sub1 = sub(["X"], ["boolean"]);
            const te1 = parseTE("((list X) -> X)");
            const unparsed = bind(sub1, (sub: S.Sub) =>
                            mapv(te1, (te: TExp) => 
                                S.applySub(sub, te)));
            
            expect(unparsed.tag).toBe("Ok");
        });
    });

    describe('equivalentTEs Extension for Lists', () => {

        it('identifies equivalent list type variables: (list T1) equivalent to (list T2)', () => {
            const te1 = parseTE("(list T1)");
            const te2 = parseTE("(list T2)");
            
            if (te1.tag === "Ok" && te2.tag === "Ok") {
                expect(equivalentTEs(te1.value, te2.value)).toBe(true);
            } else {
                fail("Parse of TExp failed");
            }
        });

        it('identifies non-equivalent list types: (list number) NOT equivalent to (list boolean)', () => {
            const te1 = parseTE("(list number)");
            const te2 = parseTE("(list boolean)");
            
            if (te1.tag === "Ok" && te2.tag === "Ok") {
                expect(equivalentTEs(te1.value, te2.value)).toBe(false);
            } else {
                fail("Parse of TExp failed");
            }
        });
    });

    describe('Type Inference Cases', () => {

        it('infers (list (list number)) for nested list literals', () => {
            const t = infer("'((1 2))");
            expect(isSome(t) && isListTExp(t.value) && isListTExp(t.value.itemTE)).toBe(true);
        });

        it('infers correct type for empty list quote via type equations', () => {
            const t = infer("'()");
            expect(isSome(t) && isListTExp(t.value)).toBe(true);
        });

        it('fails inference or correctly constraints heterogeneous list errors', () => {
            const t = infer("(cons 1 '(#t #f))"); 
            expect(isSome(t)).toBe(false); 
        });

        it('infers (list boolean) for cdr of list of booleans', () => {
            const t = infer("((lambda ((xs : (list boolean))) (cdr xs)) '(#t #f))");
            expect(isSome(t) && isListTExp(t.value) && isBoolTExp(t.value.itemTE)).toBe(true);
        });
    });
});