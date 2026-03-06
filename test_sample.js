// test_sample.js - Sample file for testing CodeShield analysis
// Contains various complexity patterns and vulnerability patterns

function simpleFunction() {
    return 42;
}

function complexFunction(x, y, z) {
    if (x > 0) {
        for (let i = 0; i < x; i++) {
            if (y > 0 && z > 0) {
                while (z > 0) {
                    z--;
                }
            } else if (y == 0) {
                console.log("zero");
            }
        }
    }
    return x ? y : z;
}

function vulnerableFunction(input) {
    eval(input);
    document.innerHTML = input;
    const password = "hardcoded123";
    return password;
}
