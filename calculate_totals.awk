BEGIN {
    total = 0
    group_total = 0
}
{
    # Extract individual sandwiches (4th field)
    gsub(/[^0-9]/, "", $4)
    individual = $4
    total += individual
    
    # Extract group totals from both formats
    if ($5 ~ /sandwichCount/) {
        if (match($5, /sandwichCount":([0-9]+)/, arr)) {
            group_total += arr[1]
        }
    }
    if ($5 ~ /"count":/) {
        if (match($5, /"count":([0-9]+)/, arr)) {
            group_total += arr[1]
        }
    }
}
END {
    print "Individual total:", total
    print "Group total:", group_total
    print "Combined total:", total + group_total
}
