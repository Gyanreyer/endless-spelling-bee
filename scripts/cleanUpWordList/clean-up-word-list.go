package main

import (
	"fmt"
	"os"
	"sort"
	"strings"
	"unicode"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func getMapKeys[K comparable, V any](m map[K]V) []K {
	keys := make([]K, len(m))
	i := 0
	for key := range m {
		keys[i] = key
		i++
	}

	return keys
}

/**
 * This script takes a messy word list manually assembled from SCOWL (http://wordlist.aspell.net/)
 * and ouputs a sanitized word list with duplicates and invalid words removed
 */
func main() {
	messyWordFileContents, err := os.ReadFile("word-lists/en/words.txt")
	check(err)

	messyWords := strings.Split(string(messyWordFileContents), "\n")

	validPanagramMap := make(map[string]bool)
	validWordMap := make(map[string]bool)

	for _, word := range messyWords {
		if len(word) < 4 {
			continue
		}

		isInvalidWord := false

		for _, char := range word {
			if !unicode.IsLetter(char) {
				isInvalidWord = true
				break
			}
		}

		if isInvalidWord {
			continue
		}

		lowerCaseWord := strings.ToLower(word)

		uniqueCharSet := make(map[rune]bool)

		for _, char := range lowerCaseWord {
			uniqueCharSet[char] = true
		}

		uniqueCharKeys := getMapKeys(uniqueCharSet)

		if len(uniqueCharKeys) == 7 {
			validPanagramMap[lowerCaseWord] = true
		}

		validWordMap[lowerCaseWord] = true
	}

	fmt.Println("Filtered to", len(validWordMap), "words")

	validWords := getMapKeys(validWordMap)
	sort.Strings(validWords)

	validWordFile, err := os.Create("word-lists/en/words-clean.txt")
	check(err)
	validWordFile.WriteString(strings.Join(validWords, "\n"))
	validWordFile.Close()

	panagramWordFile, err := os.Create("word-lists/en/panagrams-clean.txt")
	check(err)
	panagrams := getMapKeys(validPanagramMap)
	sort.Strings(panagrams)
	panagramWordFile.WriteString(strings.Join(panagrams, "\n"))
	panagramWordFile.Close()

}
