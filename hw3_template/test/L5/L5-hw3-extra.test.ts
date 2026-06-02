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

    // ========================================================
    // 1. בדיקות עבור מנגנון הסובסטיטוציות ו-applySub
    // ========================================================
    describe('Substitution ADT & applySub Extensions', () => {
        
        it('applySub - nested lists (list (list number))', () => {
            const sub1 = sub(["X"], ["number"]);
            const te1 = parseTE("(list (list X))");
            const unparsed = bind(sub1, (sub: S.Sub) =>
                            mapv(te1, (te: TExp) => // <-- שינוי מ-bind ל-mapv
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
                            mapv(te1, (te: TExp) => // <-- שינוי מ-bind ל-mapv
                                S.applySub(sub, te)));
            
            expect(unparsed.tag).toBe("Ok");
        });
    });

    // ========================================================
    // 2. בדיקות עבור שקילות של ביטויי טיפוס (equivalentTEs)
    // ========================================================
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

    // ========================================================
    // 3. בדיקות עבור היקש טיפוסים מורכב יותר (Inference & Equations)
    // ========================================================
    describe('Type Inference Cases', () => {

        it('infers (list (list number)) for nested list literals', () => {
            // רשימה שמכילה רשימה: '((1 2))
            const t = infer("'((1 2))");
            expect(isSome(t) && isListTExp(t.value) && isListTExp(t.value.itemTE)).toBe(true);
        });

        it('infers correct type for empty list quote via type equations', () => {
            const t = infer("'()");
            // מוודא שנוצר מבנה רשימה חוקי, גם אם טיפוס האיבר הוא TVar ריק כרגע
            expect(isSome(t) && isListTExp(t.value)).toBe(true);
        });

        it('fails inference or correctly constraints heterogeneous list errors', () => {
            // בדיקה שאלגוריתם הצימוד מזהה שרשימה לא הומוגנית מפרה את המשוואות
            // הערה: תלוי מימוש, אם השפה קורסת בצימוד או מחזירה None, אנחנו מוודאים שזה לא מחזיר טיפוס תקני
            const t = infer("(cons 1 '(#t #f))"); 
            expect(isSome(t)).toBe(false); 
        });

        it('infers (list boolean) for cdr of list of booleans', () => {
            const t = infer("((lambda ((xs : (list boolean))) (cdr xs)) '(#t #f))");
            expect(isSome(t) && isListTExp(t.value) && isBoolTExp(t.value.itemTE)).toBe(true);
        });
    });
});